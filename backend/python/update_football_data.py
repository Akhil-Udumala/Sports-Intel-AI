import sqlite3
import json
import os
import re

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
    db_path = os.path.join(base_dir, '../data/database.sqlite')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    all_data = {}
    
    for team, players in players_by_team.items():
        team_data = []
        for p_name in players:
            cursor.execute("SELECT player_api_id, player_name FROM Player WHERE player_name LIKE ? LIMIT 1", ('%' + p_name + '%',))
            row = cursor.fetchone()
            
            p_obj = None
            if row:
                api_id, real_name = row
                cursor.execute("""
                    SELECT 
                        overall_rating, potential, crossing, finishing, heading_accuracy, 
                        short_passing, volleys, dribbling, curve, free_kick_accuracy, 
                        long_passing, ball_control, acceleration, sprint_speed, agility, 
                        reactions, balance, shot_power, jumping, stamina, strength, 
                        long_shots, aggression, interceptions, positioning, vision, 
                        penalties, marking, standing_tackle, sliding_tackle, 
                        gk_diving, gk_handling, gk_kicking, gk_positioning, gk_reflexes
                    FROM Player_Attributes 
                    WHERE player_api_id = ? 
                    ORDER BY date DESC LIMIT 1
                """, (api_id,))
                attr = cursor.fetchone()
                
                if attr:
                    rating = attr[0] or 75
                    finishing_val = attr[3] or 50
                    passing = (attr[5] + attr[10]) / 2 if (attr[5] and attr[10]) else 50
                    stamina = attr[19] or 60
                    speed = (attr[12] + attr[13]) / 2 if (attr[12] and attr[13]) else 60
                    
                    pos = "Midfielder"
                    if attr[30] and attr[30] > 70: pos = "Goalkeeper"
                    elif attr[3] and attr[3] > 75: pos = "Forward"
                    elif (attr[28] and attr[28] > 75) or (attr[29] and attr[29] > 75): pos = "Defender"
                    
                    # Try to get actual goals from last 5 matches
                    last_5_performances = []
                    cursor.execute(f"""
                        SELECT goal FROM Match 
                        WHERE home_player_1={api_id} OR home_player_2={api_id} OR home_player_3={api_id} OR home_player_4={api_id} OR home_player_5={api_id} OR home_player_6={api_id} OR home_player_7={api_id} OR home_player_8={api_id} OR home_player_9={api_id} OR home_player_10={api_id} OR home_player_11={api_id} OR
                              away_player_1={api_id} OR away_player_2={api_id} OR away_player_3={api_id} OR away_player_4={api_id} OR away_player_5={api_id} OR away_player_6={api_id} OR away_player_7={api_id} OR away_player_8={api_id} OR away_player_9={api_id} OR away_player_10={api_id} OR away_player_11={api_id}
                        ORDER BY date DESC LIMIT 5
                    """)
                    matches = cursor.fetchall()
                    
                    import random
                    base_m_rating = (rating / 12.0) + 2.0 # e.g. 94/12 + 2 = 7.8 + 2 = 9.8? No.
                    # Let's use (rating / 15) + 2.5? 94/15 = 6.2 + 2.5 = 8.7.
                    base_m_rating = (rating / 18.0) + 3.0 # 94/18 = 5.2 + 3.0 = 8.2.
                    
                    if matches and len(matches) >= 3:
                        for m_row in matches:
                            goal_xml = m_row[0]
                            g = 0
                            a = 0
                            if goal_xml:
                                g = len(re.findall(f'<player1>{api_id}</player1>', goal_xml))
                                a = len(re.findall(f'<player2>{api_id}</player2>', goal_xml))
                            
                            m_rating = base_m_rating + (g * 1.5) + (a * 0.8) + random.uniform(-0.4, 0.4)
                            last_5_performances.append(min(10.0, max(5.0, round(m_rating, 1))))
                    else:
                        # Simulation
                        for _ in range(5):
                            g = 1 if random.random() < (finishing_val/250.0) else 0
                            a = 1 if random.random() < (passing/300.0) else 0
                            m_rating = base_m_rating + (g * 1.5) + (a * 0.8) + random.uniform(-0.6, 0.6)
                            last_5_performances.append(min(10.0, max(5.0, round(m_rating, 1))))

                    matches_count = rating + stamina
                    goals = int((finishing_val / 100) * matches_count * 0.4) if pos == "Forward" else int((finishing_val / 100) * matches_count * 0.1)
                    assists = int((passing / 100) * matches_count * 0.3) if pos != "Goalkeeper" else 0
                    
                    p_obj = {
                        "id": f"f_{api_id}",
                        "name": real_name,
                        "position": pos,
                        "rating": int(rating),
                        "goals": goals,
                        "assists": assists,
                        "passingAccuracy": int(passing),
                        "topSpeed": round(speed * 0.4, 1),
                        "stamina": int(stamina),
                        "last5Matches": last_5_performances,
                        "highestMatchScore": max(last_5_performances) if last_5_performances else 8.0,
                        "injuryRisk": round(100 - stamina, 1),
                        "fatigueScore": round(40 + (100 - stamina)/2, 1),
                        "consistencyIndex": 95,
                        "matches": int(matches_count)
                    }

            if not p_obj:
                # Fallback Simulation
                import random
                pos = "Forward" if any(x in p_name for x in ["Kane", "Mbappe", "Neymar", "Vinicius", "Havertz", "Morata"]) else "Midfielder"
                perf = [round(7.0 + random.uniform(-1, 2), 1) for _ in range(5)]
                    
                p_obj = {
                    "id": f"f_nf_{p_name.replace(' ', '_')}",
                    "name": p_name,
                    "position": pos,
                    "rating": 80,
                    "goals": 15,
                    "assists": 8,
                    "passingAccuracy": 78,
                    "topSpeed": 33.5,
                    "stamina": 75,
                    "last5Matches": perf,
                    "highestMatchScore": max(perf),
                    "injuryRisk": 15.0,
                    "fatigueScore": 25.0,
                    "consistencyIndex": 92,
                    "matches": 60
                }
            
            team_data.append(p_obj)
        
        all_data[team] = team_data
        
    conn.close()
    return all_data

def update_file(data):
    # Update footballData.js
    js_content = "export const footballTeams = " + json.dumps(data, indent=2) + ";\n"
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(base_dir, '../../frontend/src/data/footballData.js')
    with open(output_path, 'w') as f:
        f.write(js_content)
    
    # Update internationalFootballData.js
    js_content_int = "export const internationalFootballTeams = " + json.dumps(data, indent=2) + ";\n"
    output_path_int = os.path.join(base_dir, '../../frontend/src/data/internationalFootballData.js')
    with open(output_path_int, 'w') as f:
        f.write(js_content_int)

if __name__ == "__main__":
    print("Extracting data from database.sqlite...")
    data = get_db_stats()
    print("Updating footballData.js and internationalFootballData.js...")
    update_file(data)
    print("Done!")
