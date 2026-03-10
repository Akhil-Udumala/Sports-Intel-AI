import fs from 'fs';

const outDir = 'public/images/players';
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.jpg'));
const ids = files.map(f => f.replace('.jpg', ''));

const content = `// Auto-generated player image utility
export const getPlayerImage = (name, id) => {
    const successIds = ${JSON.stringify(ids)};
    
    // 1. Direct match by ID
    if (id && successIds.includes(id)) {
        return \`/images/players/\${id}.jpg\`;
    }

    // 2. Direct match by generic mapping (fallback for global stars)
    const n = name.toLowerCase().trim();
    const mappings = {
        "v kohli": "/images/players/kohli.jpg",
        "rg sharma": "/images/players/rohit.jpg",
        "jj bumrah": "/images/players/bumrah.jpg",
        "lionel messi": "/images/players/messi.jpg",
        "cristiano ronaldo": "/images/players/ronaldo.jpg",
        "neymar": "/images/players/neymar.jpg",
        "kylian mbappe": "/images/players/mbappe.jpg",
        "ms dhoni": "/images/players/dhoni.jpg",
        "da warner": "/images/players/warner.jpg"
    };
    if (mappings[n]) return mappings[n];

    // 3. Squad Placeholder Cycling
    // Instead of showing Messi to everyone, cycle through a pool of real stars
    // based on the player ID to maintain consistency for the same player.
    const getPoolIndex = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return Math.abs(hash);
    };

    const isCricket = (id && id.startsWith('c_')) || ["Warner", "Smith", "Root", "Kane", "Kohli", "Rohit"].some(k => name.includes(k));
    
    if (isCricket) {
        const pool = ["kohli", "rohit", "bumrah", "dhoni", "warner"];
        // Ensure the chosen fallback exists in our successIds
        const validPool = pool.filter(p => successIds.includes(p));
        const fallback = validPool.length > 0 ? validPool[getPoolIndex(id || name) % validPool.length] : "kohli";
        return \`/images/players/\${fallback}.jpg\`;
    } else {
        const pool = ["messi", "ronaldo", "mbappe", "neymar", "vinicius"];
        const validPool = pool.filter(p => successIds.includes(p));
        const fallback = validPool.length > 0 ? validPool[getPoolIndex(id || name) % validPool.length] : "messi";
        return \`/images/players/\${fallback}.jpg\`;
    }
};
`;

fs.writeFileSync('src/utils/playerImages.js', content);
console.log(`Updated playerImages.js with ${ids.length} images and pooling logic.`);
