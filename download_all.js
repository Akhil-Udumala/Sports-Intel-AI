import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const players = JSON.parse(fs.readFileSync('all_players.json', 'utf8'));
const outDir = 'public/images/players';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const normalizeName = (name) => {
    const shorthands = {
        'DA Warner': 'David Warner', 'SPD Smith': 'Steve Smith', 'RG Sharma': 'Rohit Sharma', 'V Kohli': 'Virat Kohli',
        'JJ Bumrah': 'Jasprit Bumrah', 'MS Dhoni': 'MS Dhoni', 'S Dhawan': 'Shikhar Dhawan', 'KS Williamson': 'Kane Williamson',
        'JE Root': 'Joe Root', 'AD Mathews': 'Angelo Mathews', 'B Kumar': 'Bhuvaneshwar Kumar', 'RA Jadeja': 'Ravindra Jadeja',
        'HH Pandya': 'Hardik Pandya', 'KL Rahul': 'KL Rahul', 'R Pant': 'Rishabh Pant', 'SA Yadav': 'Suryakumar Yadav',
        'SS Iyer': 'Shreyas Iyer', 'YS Chahal': 'Yuzvendra Chahal', 'CJ Anderson': 'Corey Anderson', 'JS Patel': 'Jeetan Patel',
        'TC Bruce': 'Tom Bruce', 'N Dickwella': 'Niroshan Dickwella', 'WU Tharanga': 'Upul Tharanga', 'S Prasanna': 'Seekkuge Prasanna',
        'MD Gunathilaka': 'Danushka Gunathilaka', 'LD Chandimal': 'Dinesh Chandimal', 'MDKJ Perera': 'Kusal Perera',
        'BKG Mendis': 'Kusal Mendis', 'DM de Silva': 'Dhananjaya de Silva', 'RAS Lakmal': 'Suranga Lakmal'
    };
    return shorthands[name] || name;
};

const run = async () => {
    for (const player of players) {
        const dest = path.join(outDir, `${player.id}.jpg`);
        if (fs.existsSync(dest)) {
            const stat = fs.statSync(dest);
            if (stat.size > 1000) continue;
        }

        const searchName = normalizeName(player.name);
        console.log(`Searching for ${player.name} (${searchName})...`);

        try {
            // Add a cookie-like delay or use a different user agent
            const res = execSync(`curl -s "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(searchName)}"`, { encoding: 'utf8' });
            if (res.includes("429")) {
                console.log("  Rate limited. Sleeping for 10s...");
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            const data = JSON.parse(res);
            if (data.player && data.player.length > 0) {
                const thumb = data.player[0].strThumb || data.player[0].strPlayerThumb;
                if (thumb && thumb !== 'null') {
                    console.log(`  Downloading ${thumb}...`);
                    execSync(`curl -s -L -o "${dest}" "${thumb}"`);
                }
            }
        } catch (e) {
            console.log(`  Skip.`);
        }

        // Polite delay
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log("Done.");
};

run();
