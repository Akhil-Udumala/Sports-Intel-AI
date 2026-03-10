import fs from 'fs';

const extractFromFiles = () => {
    const files = [
        'src/data/cricketData.js',
        'src/data/footballData.js',
        'src/data/internationalFootballData.js'
    ];

    const players = [];

    files.forEach(file => {
        if (!fs.existsSync(file)) return;
        const content = fs.readFileSync(file, 'utf8');

        const lines = content.split('\n');
        lines.forEach(line => {
            const idM = line.match(/"id":\s*"([^"]+)"/);
            const nameM = line.match(/"name":\s*"([^"]+)"/);
            if (idM && nameM) {
                players.push({ id: idM[1], name: nameM[1] });
            }
        });
    });

    return players;
};

const players = extractFromFiles();
console.log(JSON.stringify(players, null, 2));
