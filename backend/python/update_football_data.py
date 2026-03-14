import sqlite3
import json
import os
import re
import random

# List of 16 players per team
players_by_team = {
    "Argentina": ["Lionel Messi", "Angel Di Maria", "Nicolas Otamendi", "Paulo Dybala", "Emiliano Martinez", "Lisandro Martinez", "Rodrigo De Paul", "Julian Alvarez", "Lautaro Martinez", "Enzo Fernandez", "Alexis Mac Allister", "Cristian Romero", "Nahuel Molina", "Marcos Acuna", "Leandro Paredes", "Guido Rodriguez"],
    "Brazil": ["Neymar", "Vinicius Junior", "Casemiro", "Marquinhos", "Alisson", "Ederson", "Gabriel Jesus", "Richarlison", "Lucas Paqueta", "Rodrygo", "Bruno Guimaraes", "Thiago Silva", "Danilo", "Alex Sandro", "Antony", "Gabriel Martinelli"],
    "Portugal": ["Cristiano Ronaldo", "Bernardo Silva", "Bruno Fernandes", "Joao Cancelo", "Ruben Dias", "Diogo Jota", "Joao Felix", "Pepe", "Rafael Leao", "Ruben Neves", "Nuno Mendes", "Otavio", "Vitinha", "Diogo Costa", "Goncalo Ramos", "Raphael Guerreiro"],
    "France": ["Kylian Mbappe", "Antoine Griezmann", "Olivier Giroud", "Kingsley Coman", "Ousmane Dembele", "Hugo Lloris", "Raphael Varane", "Theo Hernandez", "Aurelien Tchouameni", "Eduardo Camavinga", "Dayot Upamecano", "Jules Kounde", "Mike Maignan", "Karim Benzema", "N'Golo Kante", "Paul Pogba"],
    "England": ["Harry Kane", "Bukayo Saka", "Phil Foden", "Jude Bellingham", "Declan Rice", "Kyle Walker", "John Stones", "Jordan Pickford", "Jack Grealish", "Marcus Rashford", "Luke Shaw", "Harry Maguire", "Trent Alexander-Arnold", "Kieran Trippier", "Reece James", "Jordan Henderson"],
    "Germany": ["Thomas Mueller", "Manuel Neuer", "Leroy Sane", "Joshua Kimmich", "Ilkay Guendogan", "Kai Havertz", "Serge Gnabry", "Jamal Musiala", "Leon Goretzka", "Marc-Andre ter Stegen", "Antonio Ruediger", "Niklas Suele", "David Raum", "Matthias Ginter", "Jonas Hofmann", "Niclas Fuellkrug"],
    "Spain": ["Alvaro Morata", "Pedri", "Gavi", "Rodri", "Aymeric Laporte", "Dani Carvajal", "Pau Torres", "Ferran Torres", "Marco Asensio", "Jordi Alba", "Sergio Busquets", "Unai Simon", "Koke", "Mikel Oyarzabal", "Ansu Fati", "Dani Olmo"]
}

def get_db_stats():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    possible_paths = [
        os.path.join(base_dir, '../data/database.sqlite'),
        os.path.join(base_dir, '../../database.sqlite'),
        os.path.join(base_dir, 'database.sqlite'),
        os.path.abspath(os.path.join(base_dir, "../../../database.sqlite"))
    ]
    
    db_path = ""
    for path in possible_paths:
        if os.path.exists(path):
            db_path = path
            break
            
    if not db_path:
        print("Warning: database.sqlite not found. Using fallback simulation.")
        return get_fallback_data()

    print(f"Using database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    all_data = {}
    
    # 1. Fetch all players to mapping
    all_players_list = []
    for players in players_by_team.values():
        all_players_list.extend(players)
    
    player_id_map = {}
    print(f"Searching for {len(all_players_list)} players...")
    for p_name in all_players_list:
        cursor.execute("SELECT player_api_id, player_name FROM Player WHERE player_name LIKE ? LIMIT 1", ('%' + p_name + '%',))
        row = cursor.fetchone()
        if row:
            player_id_map[p_name] = {"api_id": row["player_api_id"], "real_name": row["player_name"]}

    # 2. Bulk fetch attributes
    api_ids = [v["api_id"] for v in player_id_map.values()]
    if not api_ids:
        print("No players found in database.")
        conn.close()
        return get_fallback_data()

    print(f"Fetching attributes for {len(api_ids)} players...")
    placeholders = ",".join(["?"] * len(api_ids))
    cursor.execute(f"""
        SELECT * FROM Player_Attributes 
        WHERE player_api_id IN ({placeholders})
        GROUP BY player_api_id
        HAVING date = MAX(date)
    """, api_ids)
    
    attr_map = {row["player_api_id"]: row for row in cursor.fetchall()}

    # 3. Optimize Match query - fetch matches for ALL players at once
    # This is still tricky with 22 columns, but better to fetch all and filter in Python
    # OR fetch for the last year or something?
    # Let's try fetching the last 10,000 matches and processing in memory once.
    print("Fetching recent match data for performance trends...")
    cursor.execute("SELECT goal, home_player_1, home_player_2, home_player_3, home_player_4, home_player_5, home_player_6, home_player_7, home_player_8, home_player_9, home_player_10, home_player_11, away_player_1, away_player_2, away_player_3, away_player_4, away_player_5, away_player_6, away_player_7, away_player_8, away_player_9, away_player_10, away_player_11 FROM Match ORDER BY date DESC LIMIT 5000")
    recent_matches = cursor.fetchall()

    player_performances = {api_id: [] for api_id in api_ids}
    for match in recent_matches:
        goal_xml = match["goal"]
        # Check which of our target players were in this match
        match_players = []
        for i in range(1, 12):
            hp = match[f"home_player_{i}"]
            ap = match[f"away_player_{i}"]
            if hp in player_performances: match_players.append(hp)
            if ap in player_performances: match_players.append(ap)
        
        if not match_players:
            continue
            
        for p_id in match_players:
            perf_list = player_performances.get(p_id)
            if perf_list is None:
                continue
            if len(perf_list) >= 5:
                continue
            
            g = 0
            a = 0
            if goal_xml:
                p_id_str = str(p_id)
                g = len(re.findall(f'<player1>{p_id_str}</player1>', goal_xml))
                a = len(re.findall(f'<player2>{p_id_str}</player2>', goal_xml))
            
            # Temporary rating logic
            perf_list.append({"goals": g, "assists": a})

    print("Assembling team data...")
    for team, players in players_by_team.items():
        team_data = []
        for p_name in players:
            p_info = player_id_map.get(p_name)
            p_obj = None
            
            if p_info:
                api_id = p_info["api_id"]
                attr = attr_map.get(api_id)
                
                if attr:
                    rating = float(attr["overall_rating"] or 75)
                    finishing_val = float(attr["finishing"] or 50)
                    passing = (float(attr["short_passing"] or 50) + float(attr["long_passing"] or 50)) / 2
                    stamina_val = float(attr["stamina"] or 60)
                    speed = (float(attr["acceleration"] or 60) + float(attr["sprint_speed"] or 60)) / 2
                    
                    pos = "Midfielder"
                    if attr["gk_diving"] and attr["gk_diving"] > 70: pos = "Goalkeeper"
                    elif attr["finishing"] and attr["finishing"] > 75: pos = "Forward"
                    elif (attr["standing_tackle"] and attr["standing_tackle"] > 75) or (attr["sliding_tackle"] and attr["sliding_tackle"] > 75): pos = "Defender"
                    
                    # Performance calculation
                    perf_data = player_performances.get(api_id, [])
                    last_5_performances = []
                    base_m_rating = (rating * 0.08) + 1.0
                    
                    for p in perf_data:
                        m_rating = float(base_m_rating + (p["goals"] * 1.5) + (p["assists"] * 0.8) + random.uniform(-0.4, 0.4))
                        last_5_performances.append(min(10.0, max(5.0, round(m_rating * 10) / 10.0)))
                    
                    while len(last_5_performances) < 5:
                        g = 1 if random.random() < (finishing_val/250.0) else 0
                        a = 1 if random.random() < (passing/300.0) else 0
                        m_rating = float(base_m_rating + (g * 1.5) + (a * 0.8) + random.uniform(-0.6, 0.6))
                        last_5_performances.append(min(10.0, max(5.0, round(m_rating * 10) / 10.0)))

                    matches_count = rating + stamina_val
                    goals = int((finishing_val / 100.0) * matches_count * 0.3) if pos == "Forward" else int((finishing_val / 100.0) * matches_count * 0.08)
                    assists = int((passing / 100.0) * matches_count * 0.25) if pos != "Goalkeeper" else 0
                    
                    p_obj = {
                        "id": f"f_{api_id}",
                        "name": p_info["real_name"],
                        "position": pos,
                        "rating": int(rating),
                        "goals": goals,
                        "assists": assists,
                        "passingAccuracy": int(passing),
                        "topSpeed": round(speed * 0.4 * 10) / 10.0,
                        "stamina": int(stamina_val),
                        "last5Matches": last_5_performances,
                        "highestMatchScore": max(last_5_performances) if last_5_performances else 8.0,
                        "injuryRisk": round((100 - stamina_val) * 10) / 10.0,
                        "fatigueScore": round((40 + (100 - stamina_val)/2.0) * 10) / 10.0,
                        "consistencyIndex": 95,
                        "matches": int(matches_count)
                    }

            if not p_obj:
                perf = [round(float(7.5 + random.uniform(-1, 1.5)) * 10) / 10.0 for _ in range(5)]
                p_obj = {
                    "id": f"f_nf_{p_name.replace(' ', '_').lower()}",
                    "name": p_name,
                    "position": "Midfielder",
                    "rating": 82,
                    "goals": 12,
                    "assists": 7,
                    "passingAccuracy": 80,
                    "topSpeed": 33.2,
                    "stamina": 78,
                    "last5Matches": perf,
                    "highestMatchScore": max(perf),
                    "injuryRisk": 12.5,
                    "fatigueScore": 22.0,
                    "consistencyIndex": 94,
                    "matches": 55
                }
            team_data.append(p_obj)
        all_data[team] = team_data
        print(f"  - Completed {team}")
        
    conn.close()
    return all_data

def get_fallback_data():
    all_data = {}
    for team, players in players_by_team.items():
        team_data = []
        for p_name in players:
            perf = [round(float(7.0 + random.uniform(-1, 2)) * 10) / 10.0 for _ in range(5)]
            team_data.append({
                "id": f"f_fb_{p_name.replace(' ', '_').lower()}",
                "name": p_name,
                "position": "Midfielder",
                "rating": 80,
                "goals": 10,
                "assists": 5,
                "passingAccuracy": 78,
                "topSpeed": 31.5,
                "stamina": 75,
                "last5Matches": perf,
                "highestMatchScore": max(perf),
                "injuryRisk": 15.0,
                "fatigueScore": 25.0,
                "consistencyIndex": 90,
                "matches": 50
            })
        all_data[team] = team_data
    return all_data

def update_file(data):
    js_content = "export const footballTeams = " + json.dumps(data, indent=2) + ";\n"
    output_path = '/tmp/footballData.js'
    with open(output_path, 'w') as f:
        f.write(js_content)
    
    js_content_int = "export const internationalFootballTeams = " + json.dumps(data, indent=2) + ";\n"
    output_path_int = '/tmp/internationalFootballData.js'
    with open(output_path_int, 'w') as f:
        f.write(js_content_int)
    print(f"Data temporarily written to {output_path} and {output_path_int}")

if __name__ == "__main__":
    print("Extracting data from database.sqlite...")
    data = get_db_stats()
    print("Updating footballData.js and internationalFootballData.js...")
    update_file(data)
    print("Done!")
