import subprocess
import re
import json
import os
import sys

# --- KONFIGURATION ---
FILNAVN = "lydfil.mp3"
PAUSE_DB = "-35dB"      # Hvor stille skal det være? (fx -30dB til -50dB)
PAUSE_VARIGHED = "0.4"  # Minimum stilhed i sekunder for at splitte

# Din tekstliste (Den samme som før)
tekster = [
"Taler på dansk", "Prøv igen!", "Næsten!", "Flot!", "Rigtigt!", "Godt klaret!", "Tjek planen!", "Fodr løverne!", "Fodr aberne!", "Fodr elefanterne!", "Fodr pingvinerne!",
]

def find_ffmpeg():
    """Finder ffmpeg.exe i nuværende mappe eller i systemet"""
    if os.path.exists("ffmpeg.exe"):
        return "ffmpeg.exe"
    # Tjekker om det er installeret globalt (Winget)
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return "ffmpeg"
    except FileNotFoundError:
        return None

def generer_id(tekst, index):
    clean = tekst.lower().replace("!", "").replace(".", "").replace("?", "").replace(" ", "_")
    return f"id_{index}_{clean}"

print(f"Starter analyse af '{FILNAVN}'...")

ffmpeg_cmd = find_ffmpeg()
if not ffmpeg_cmd:
    print("FEJL: Kunne ikke finde ffmpeg.exe!")
    print("Sørg for at ffmpeg.exe ligger i samme mappe som dette script.")
    sys.exit(1)

# Vi beder FFmpeg om at køre et 'silencedetect' filter
# Kommandoen ser ca sådan ud: ffmpeg -i fil.mp3 -af silencedetect=noise=-30dB:d=0.3 -f null -
command = [
    ffmpeg_cmd,
    "-i", FILNAVN,
    "-af", f"silencedetect=noise={PAUSE_DB}:d={PAUSE_VARIGHED}",
    "-f", "null",
    "-"
]

try:
    # Kør ffmpeg og fang outputtet (det kommer ud på 'stderr')
    result = subprocess.run(command, stderr=subprocess.PIPE, text=True, encoding='utf-8')
    output = result.stderr
except Exception as e:
    print(f"Der skete en fejl under kørsel af FFmpeg: {e}")
    sys.exit(1)

# Analyser outputtet for at finde tider
timestamps = []
last_sound_start = 0.0

# Regex til at finde linjer som: "silence_start: 4.5" og "silence_end: 5.2"
regex_start = re.compile(r"silence_start:\s+([\d\.]+)")
regex_end = re.compile(r"silence_end:\s+([\d\.]+)")

# Vi læser linje for linje
for line in output.split('\n'):
    start_match = regex_start.search(line)
    end_match = regex_end.search(line)
    
    if start_match:
        # Stilhed starter her -> Lyden sluttede her
        silence_start_time = float(start_match.group(1))
        
        # Hvis der er et gyldigt tidsrum, gem det som et "ord/sætning"
        if silence_start_time > last_sound_start: #+ 0.1: # Ignorer ultra-korte klik
            timestamps.append((last_sound_start, silence_start_time))
            
    if end_match:
        # Stilhed slutter her -> Ny lyd starter her
        last_sound_start = float(end_match.group(1))

# Husk det sidste segment (hvis filen ikke slutter med stilhed)
# Vi gætter på at filen slutter nu, hvis vi ikke har fundet stilhed for nylig
# (FFmpeg giver os duration i outputtet, men vi gør det simpelt her)
if timestamps and timestamps[-1][1] < last_sound_start:
    # Tilføj en slutning manuelt (fx +2 sekunder fra start) hvis vi mangler slutningen
    pass 
    # Note: FFmpeg silencedetect fanger som regel ikke allersidste bid hvis filen klipper brat,
    # men lad os se hvor mange vi fandt.

print(f"Fandt {len(timestamps)} lyd-bidder.")

if len(timestamps) < len(tekster):
    print(f"ADVARSEL: Fandt færre bidder ({len(timestamps)}) end tekster ({len(tekster)}).")
    print("Prøv at ændre PAUSE_DB til -30dB eller PAUSE_VARIGHED til 0.2 i toppen af scriptet.")
    
    # "Redder" data ved at tilføje dummy-data hvis vi mangler, så programmet ikke crasher
    while len(timestamps) < len(tekster):
        timestamps.append((0.0, 0.0))

json_data = []

for i, tekst in enumerate(tekster):
    if i < len(timestamps):
        start, slut = timestamps[i]
        
        obj = {
            "id": generer_id(tekst, i),
            "tekst": tekst,
            "start": round(start, 3),
            "slut": round(slut, 3)
        }
        json_data.append(obj)

with open('lyd_data.json', 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)

print("Succes! Data gemt i 'lyd_data.json'")