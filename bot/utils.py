import json
import os
import subprocess
import sys

def check_java_installation():
    """Vérifier si Java est installé"""
    try:
        result = subprocess.run(['java', '-version'], 
                              capture_output=True, 
                              text=True)
        print("Java installé:")
        print(result.stderr.split('\n')[0])
        return True
    except FileNotFoundError:
        print("Java n'est pas installé!")
        return False

def setup_minecraft_client(version: str = "1.20.1"):
    """Configurer le client Minecraft"""
    # Cette fonction pourrait être étendue pour télécharger
    # le client Minecraft si nécessaire
    print(f"Préparation pour Minecraft {version}")
    return True

def load_mods_config(config_path: str = 'config/mods.json'):
    """Charger la configuration des mods"""
    default_config = {
        "required_mods": [
            {"name": "jei", "id": "jei"},
            {"name": "journeymap", "id": "journeymap"}
        ],
        "optional_mods": [],
        "forge_version": "recommended"
    }
    
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return json.load(f)
    else:
        os.makedirs('config', exist_ok=True)
        with open(config_path, 'w') as f:
            json.dump(default_config, f, indent=4)
        return default_config
