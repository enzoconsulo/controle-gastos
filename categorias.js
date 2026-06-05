// Arquivo: categorias.js
const DICT_CATEGORIAS = {
    alimentacao: [
        'ifood', 'ifd*', 'rappi', 'ze delivery', 'mcdonald', 'burger king', 'bk', 'subway', 'outback', 'habibs', 'kfc', 'bobs', 'madero', 'coco bambu', 
        'fast pizza', 'restaurante', 'padaria', 'lanchonete', 'pizzaria', 'cafe', 'bar', 'sorveteria', 'doceria', 'confeitaria', 
        'pastel', 'esfiha', 'boteco', 'bistro', 'pub', 'cantina', 'comida', 'acai', 'churrascaria', 'starbucks', 'cacau show', 'kopenhagen'
    ],
    mercado: [
        'mercado', 'supermercado', 'atacad', 'carrefour', 'assai', 'pao de acucar', 'extra', 'mambo', 'dia', 'dalben', 'tauste', 'savegnago',
        'hortifruti', 'sacolao', 'acougue', 'peixaria', 'mercearia', 'hipermercado', 'makro', 'sams club', 
        'muffato', 'oxxo', 'ampm', 'tenda', 'spani', 'swift'
    ],
    gasolina: [
        'posto', 'shell', 'ipiranga', 'petrobras', 'br', 'ale', 'conveniencia', 'lubrificante', 'box pit stop', 'chiminazzo', 'combustivel'
    ],
    transporte: [
        'uber', '99', '99app', 'indriver', 'taxi', 'onibus', 'metro', 'cptm', 'sptrans', 'emtu', 'passagem', 'detran', 'ipva', 'multa',
        'buser', 'clickbus', 'gol', 'latam', 'azul', 'pedagio', 'sem parar', 'conectcar', 'veloe', 'estacionamento', 'estapar', 'cabify', 'blablacar', 'movida', 'localiza'
    ],
    assinaturas: [
        'netflix', 'spotify', 'amazon', 'prime', 'disney', 'hbo', 'max', 'apple', 'icloud', 'google', 'youtube', 
        'playstation', 'xbox', 'nintendo', 'adobe', 'canva', 'chatgpt', 'openai', 'microsoft', 'globo', 'crunchyroll', 'gympass', 'totalpass', 'kindle', 'paramount'
    ],
    saude: [
        'farmacia', 'drogaria', 'raia', 'drogasil', 'pague menos', 'sao paulo', 'panvel', 'ultrafarma', 'hospital', 
        'clinica', 'medico', 'dentista', 'odonto', 'laboratorio', 'fleury', 'lavoisier', 'consulta', 'exame', 
        'terapia', 'psicologo', 'academia', 'smart fit', 'bluefit', 'unimed', 'amil', 'sulamerica', 'bradesco saude'
    ],
    lazer: [
        'cinema', 'cinemark', 'cinepolis', 'kinoplex', 'ingresso', 'sympla', 'eventim', 'ticket360', 'show', 'betano', 'kaizen gaming', 'foggo entertainment', 'blaze', 'bet365',
        'teatro', 'museu', 'parque', 'boliche', 'kart', 'clube', 'viagem', 'hotel', 'airbnb', 'decolar', 'cvc', 'resort', 'steam', 'epic games', 'blizzard', 'riot'
    ],
    investimento: [
        'rico', 'clear', 'xp', 'btg', 'avenue', 'nomad', 'binance', 'foxbit', 'mercado bitcoin', 'corretora', 'tesouro', 'rdb', 'reserva imediata', 'cdb', 'fundo', 'b3', 'nu invest', 'easynvest'
    ],
    impressora3d: [
        '3d', 'filamento', 'resina', 'creality', 'bambu lab', 'ender', 'petg', 'pla', 'abs', 'maker', 
        'componentes', 'arduino', 'eletronica', 'frete', 'correios', 'loggi', 'jadlog', 'aliexpress', 'shopee', 'shpp', 'eletronicwave', 'mercado livre', 'mercadolivre', 'meli', 'loja do mecanico'
    ],
    outros: [
        // Serviços, contas de casa e lojas variadas mapeadas para cair na categoria "outros" padrão do seu sistema
        'barbearia', 'cabeleireiro', 'salao', 'pet shop', 'cobasi', 'petz', 'veterinario', 'thavma', 
        'enel', 'cpfl', 'copel', 'cemig', 'sabesp', 'sanasa', 'claro', 'vivo', 'tim', 'oi', 'net',
        'renner', 'c&a', 'riachuelo', 'zara', 'shein', 'magalu', 'magazine luiza', 'casas bahia', 'americanas', 'centauro', 'netshoes', 'dafiti', 'kalunga', 'havan'
    ]
};
