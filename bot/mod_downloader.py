import aiohttp
import asyncio
import os
import json
import re
from bs4 import BeautifulSoup
from typing import Optional, List

class ModDownloader:
    def __init__(self, minecraft_version: str, mods_folder: str = '/app/mods'):
        self.minecraft_version = minecraft_version
        self.mods_folder = mods_folder
        self.forge_versions_url = "https://files.minecraftforge.net/net/minecraftforge/forge/"
        self.curseforge_api = "https://api.cfwidget.com/"
        
        # Créer le dossier des mods
        os.makedirs(mods_folder, exist_ok=True)
    
    async def install_forge(self) -> Optional[str]:
        """Installer Forge automatiquement"""
        try:
            print(f"Recherche de Forge pour Minecraft {self.minecraft_version}...")
            
            async with aiohttp.ClientSession() as session:
                # Récupérer la page des versions Forge
                async with session.get(self.forge_versions_url) as response:
                    if response.status != 200:
                        print("Impossible de récupérer les versions Forge")
                        return None
                    
                    html = await response.text()
                    
                # Chercher la version de Forge
                forge_version = await self.find_forge_version(html)
                
                if not forge_version:
                    print(f"Aucune version Forge trouvée pour {self.minecraft_version}")
                    return None
                
                # Télécharger Forge
                forge_url = f"https://maven.minecraftforge.net/net/minecraftforge/forge/{self.minecraft_version}-{forge_version}/forge-{self.minecraft_version}-{forge_version}-installer.jar"
                
                forge_path = os.path.join(self.mods_folder, f"forge-{self.minecraft_version}-installer.jar")
                
                print(f"Téléchargement de Forge: {forge_url}")
                async with session.get(forge_url) as response:
                    if response.status == 200:
                        with open(forge_path, 'wb') as f:
                            f.write(await response.read())
                        print(f"Forge téléchargé: {forge_path}")
                        return forge_path
                    else:
                        print(f"Erreur téléchargement Forge: {response.status}")
                        return None
                        
        except Exception as e:
            print(f"Erreur lors de l'installation de Forge: {e}")
            return None
    
    async def find_forge_version(self, html: str) -> Optional[str]:
        """Trouver la dernière version de Forge"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Chercher la version dans la page
        pattern = re.compile(f"{self.minecraft_version}-([0-9.]+)")
        
        for element in soup.find_all(text=pattern):
            match = pattern.search(str(element))
            if match:
                return match.group(1)
        
        return None
    
    async def download_mod(self, mod_id: str, mod_name: str = None) -> Optional[str]:
        """Télécharger un mod depuis CurseForge"""
        try:
            async with aiohttp.ClientSession() as session:
                # Chercher le mod
                search_url = f"{self.curseforge_api}{mod_id}"
                if mod_name:
                    search_url = f"{self.curseforge_api}minecraft/search?search={mod_name}"
                
                async with session.get(search_url) as response:
                    if response.status != 200:
                        return None
                    
                    data = await response.json()
                
                # Trouver la version compatible
                files = data.get('files', [])
                compatible_file = None
                
                for file in files:
                    game_versions = file.get('game_versions', [])
                    if self.minecraft_version in game_versions:
                        compatible_file = file
                        break
                
                if not compatible_file:
                    print(f"Aucune version compatible pour {mod_id}")
                    return None
                
                # Télécharger le mod
                download_url = compatible_file.get('download_url')
                if not download_url:
                    return None
                
                mod_filename = os.path.basename(download_url)
                mod_path = os.path.join(self.mods_folder, mod_filename)
                
                async with session.get(download_url) as response:
                    if response.status == 200:
                        with open(mod_path, 'wb') as f:
                            f.write(await response.read())
                        print(f"Mod téléchargé: {mod_path}")
                        return mod_path
                    
        except Exception as e:
            print(f"Erreur téléchargement mod: {e}")
        
        return None
    
    async def download_mods_from_list(self, mods_list: List[dict]):
        """Télécharger une liste de mods"""
        downloaded = []
        
        for mod in mods_list:
            mod_id = mod.get('id')
            mod_name = mod.get('name')
            
            if mod_id:
                path = await self.download_mod(mod_id, mod_name)
                if path:
                    downloaded.append(path)
        
        print(f"{len(downloaded)} mod(s) téléchargé(s)")
        return downloaded
