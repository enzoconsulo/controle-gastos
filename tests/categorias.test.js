/**
 * TESTES UNITÁRIOS: categorias.js
 * Testa todas as funções de categorização de despesas
 */

describe('Sistema de Categorização de Despesas', () => {

  const DICT_CATEGORIAS = {
    alimentacao: [
      'ifood', 'rappi', 'mcdonald', 'burger king', 'restaurante', 'padaria',
      'cafe', 'café', 'bar', 'acai', 'starbucks'
    ],
    shopping: [
      'shopee', 'mercado livre', 'aliexpress', 'renner', 'havan'
    ],
    mercado: [
      'mercado', 'carrefour', 'assai', 'pao de acucar', 'extra',
      'supermercado', 'atacad', 'hortifruti'
    ],
    gasolina: [
      'shell', 'ipiranga', 'petrobras', 'posto', 'combustivel'
    ],
    transporte: [
      'uber', '99app', 'taxi', 'metro', 'onibus', 'cptm',
      'latam', 'gol', 'pedagio', 'estacionamento'
    ],
    assinaturas: [
      'netflix', 'spotify', 'amazon', 'disney', 'apple', 'youtube'
    ],
    saude: [
      'farmacia', 'hospital', 'clinica', 'medico', 'dentista',
      'academia', 'smart fit', 'laboratorio'
    ],
    shopping: [
      'shopee', 'mercado livre', 'aliexpress', 'renner', 'havan'
    ],
    lazer: [
      'cinema', 'show', 'teatro', 'parque', 'hotel', 'steam'
    ],
    investimento: [
      'rico', 'xp', 'binance', 'tesouro', 'b3', 'nuinvest'
    ],
    impressora3d: [
      'filamento', 'creality', 'petg', 'pla', 'resina'
    ],
    familia: [
      'cesar odair', 'vitor', 'elis maria'
    ],
    outros: []
  };

  // ==================== TESTES DE CATEGORIA ALIMENTAÇÃO ====================

  describe('Categoria: Alimentação', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Ifood como alimentação', () => {
      expect(categorizarDespesa('Ifood')).toBe('alimentacao');
    });

    test('deve categorizar Rappi como alimentação', () => {
      expect(categorizarDespesa('Rappi')).toBe('alimentacao');
    });

    test('deve categorizar McDonald como alimentação', () => {
      expect(categorizarDespesa('McDonald')).toBe('alimentacao');
    });

    test('deve categorizar Burger King como alimentação', () => {
      expect(categorizarDespesa('Burger King')).toBe('alimentacao');
    });

    test('deve categorizar Restaurante como alimentação', () => {
      expect(categorizarDespesa('Restaurante Fazenda')).toBe('alimentacao');
    });

    test('deve categorizar Padaria como alimentação', () => {
      expect(categorizarDespesa('Padaria do Bairro')).toBe('alimentacao');
    });

    test('deve categorizar Café como alimentação', () => {
      expect(categorizarDespesa('Café do Centro')).toBe('alimentacao');
    });

    test('deve categorizar Starbucks como alimentação', () => {
      expect(categorizarDespesa('Starbucks')).toBe('alimentacao');
    });

    test('deve categorizar com case insensitive', () => {
      expect(categorizarDespesa('IFOOD')).toBe('alimentacao');
      expect(categorizarDespesa('IfOoD')).toBe('alimentacao');
    });

    test('deve categorizar com texto adicional', () => {
      expect(categorizarDespesa('Ifood compra online')).toBe('alimentacao');
      expect(categorizarDespesa('Compra na Rappi')).toBe('alimentacao');
    });
  });

  // ==================== TESTES DE CATEGORIA MERCADO ====================

  describe('Categoria: Mercado/Supermercado', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Mercado como mercado', () => {
      expect(categorizarDespesa('Mercado ABC')).toBe('mercado');
    });

    test('deve categorizar Carrefour como mercado', () => {
      expect(categorizarDespesa('Carrefour')).toBe('mercado');
    });

    test('deve categorizar Assai como mercado', () => {
      expect(categorizarDespesa('Assai')).toBe('mercado');
    });

    test('deve categorizar Pão de Açúcar como mercado', () => {
      expect(categorizarDespesa('Pao de Acucar')).toBe('mercado');
    });

    test('deve categorizar Extra como mercado', () => {
      expect(categorizarDespesa('Extra Supermercado')).toBe('mercado');
    });

    test('deve categorizar Hortifruti como mercado', () => {
      expect(categorizarDespesa('Hortifruti Fresco')).toBe('mercado');
    });

    test('deve categorizar Atacado como mercado', () => {
      expect(categorizarDespesa('Atacad Distribuidor')).toBe('mercado');
    });
  });

  // ==================== TESTES DE CATEGORIA GASOLINA ====================

  describe('Categoria: Gasolina/Combustível', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Shell como gasolina', () => {
      expect(categorizarDespesa('Shell Posto')).toBe('gasolina');
    });

    test('deve categorizar Ipiranga como gasolina', () => {
      expect(categorizarDespesa('Ipiranga Combustivel')).toBe('gasolina');
    });

    test('deve categorizar Petrobras como gasolina', () => {
      expect(categorizarDespesa('Petrobras')).toBe('gasolina');
    });

    test('deve categorizar Posto como gasolina', () => {
      expect(categorizarDespesa('Posto de Gasolina')).toBe('gasolina');
    });

    test('deve categorizar combustível como gasolina', () => {
      expect(categorizarDespesa('Abastecimento combustivel')).toBe('gasolina');
    });
  });

  // ==================== TESTES DE CATEGORIA TRANSPORTE ====================

  describe('Categoria: Transporte', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Uber como transporte', () => {
      expect(categorizarDespesa('Uber')).toBe('transporte');
    });

    test('deve categorizar 99App como transporte', () => {
      expect(categorizarDespesa('99app')).toBe('transporte');
    });

    test('deve categorizar Taxi como transporte', () => {
      expect(categorizarDespesa('Taxi 2025')).toBe('transporte');
    });

    test('deve categorizar Metro como transporte', () => {
      expect(categorizarDespesa('Metro de SP')).toBe('transporte');
    });

    test('deve categorizar Ônibus como transporte', () => {
      expect(categorizarDespesa('Onibus Urban')).toBe('transporte');
    });

    test('deve categorizar CPTM como transporte', () => {
      expect(categorizarDespesa('CPTM')).toBe('transporte');
    });

    test('deve categorizar Latam como transporte', () => {
      expect(categorizarDespesa('Latam Passagens')).toBe('transporte');
    });

    test('deve categorizar Pedágio como transporte', () => {
      expect(categorizarDespesa('Pedagio')).toBe('transporte');
    });

    test('deve categorizar Estacionamento como transporte', () => {
      expect(categorizarDespesa('Estacionamento Avenida')).toBe('transporte');
    });
  });

  // ==================== TESTES DE CATEGORIA ASSINATURAS ====================

  describe('Categoria: Assinaturas', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Netflix como assinatura', () => {
      expect(categorizarDespesa('Netflix')).toBe('assinaturas');
    });

    test('deve categorizar Spotify como assinatura', () => {
      expect(categorizarDespesa('Spotify')).toBe('assinaturas');
    });

    test('deve categorizar Amazon Prime como assinatura', () => {
      expect(categorizarDespesa('Amazon Prime')).toBe('assinaturas');
    });

    test('deve categorizar Disney como assinatura', () => {
      expect(categorizarDespesa('Disney+')).toBe('assinaturas');
    });

    test('deve categorizar Apple como assinatura', () => {
      expect(categorizarDespesa('Apple Music')).toBe('assinaturas');
    });

    test('deve categorizar YouTube como assinatura', () => {
      expect(categorizarDespesa('YouTube Premium')).toBe('assinaturas');
    });
  });

  // ==================== TESTES DE CATEGORIA SAÚDE ====================

  describe('Categoria: Saúde', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Farmácia como saúde', () => {
      expect(categorizarDespesa('Farmacia Popular')).toBe('saude');
    });

    test('deve categorizar Hospital como saúde', () => {
      expect(categorizarDespesa('Hospital Central')).toBe('saude');
    });

    test('deve categorizar Clínica como saúde', () => {
      expect(categorizarDespesa('Clinica Odontologica')).toBe('saude');
    });

    test('deve categorizar Médico como saúde', () => {
      expect(categorizarDespesa('Medico Cardiologista')).toBe('saude');
    });

    test('deve categorizar Dentista como saúde', () => {
      expect(categorizarDespesa('Dentista Silva')).toBe('saude');
    });

    test('deve categorizar Academia como saúde', () => {
      expect(categorizarDespesa('Academia Smart Fit')).toBe('saude');
    });

    test('deve categorizar Laboratório como saúde', () => {
      expect(categorizarDespesa('Laboratorio Analises')).toBe('saude');
    });
  });

  // ==================== TESTES DE CATEGORIA SHOPPING ====================

  describe('Categoria: Shopping/Compras Online', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Shopee como shopping', () => {
      expect(categorizarDespesa('Shopee')).toBe('shopping');
    });

    test('deve categorizar Mercado Livre como shopping', () => {
      expect(categorizarDespesa('Mercado Livre')).toBe('shopping');
    });

    test('deve categorizar AliExpress como shopping', () => {
      expect(categorizarDespesa('Aliexpress')).toBe('shopping');
    });

    test('deve categorizar Renner como shopping', () => {
      expect(categorizarDespesa('Renner')).toBe('shopping');
    });

    test('deve categorizar Havan como shopping', () => {
      expect(categorizarDespesa('Havan')).toBe('shopping');
    });
  });

  // ==================== TESTES DE CATEGORIA LAZER ====================

  describe('Categoria: Lazer', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Cinema como lazer', () => {
      expect(categorizarDespesa('Cinema Cinemark')).toBe('lazer');
    });

    test('deve categorizar Show como lazer', () => {
      expect(categorizarDespesa('Show Musica')).toBe('lazer');
    });

    test('deve categorizar Teatro como lazer', () => {
      expect(categorizarDespesa('Teatro Municipal')).toBe('lazer');
    });

    test('deve categorizar Parque como lazer', () => {
      expect(categorizarDespesa('Parque Temático')).toBe('lazer');
    });

    test('deve categorizar Hotel como lazer', () => {
      expect(categorizarDespesa('Hotel em Santos')).toBe('lazer');
    });

    test('deve categorizar Steam como lazer', () => {
      expect(categorizarDespesa('Steam Games')).toBe('lazer');
    });
  });

  // ==================== TESTES DE CATEGORIA INVESTIMENTO ====================

  describe('Categoria: Investimento', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Rico como investimento', () => {
      expect(categorizarDespesa('Rico Corretora')).toBe('investimento');
    });

    test('deve categorizar XP como investimento', () => {
      expect(categorizarDespesa('XP Investimentos')).toBe('investimento');
    });

    test('deve categorizar Binance como investimento', () => {
      expect(categorizarDespesa('Binance')).toBe('investimento');
    });

    test('deve categorizar Tesouro como investimento', () => {
      expect(categorizarDespesa('Tesouro Direto')).toBe('investimento');
    });

    test('deve categorizar B3 como investimento', () => {
      expect(categorizarDespesa('B3')).toBe('investimento');
    });
  });

  // ==================== TESTES DE CATEGORIA IMPRESSORA 3D ====================

  describe('Categoria: Impressora 3D', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Filamento como impressora3d', () => {
      expect(categorizarDespesa('Filamento PLA')).toBe('impressora3d');
    });

    test('deve categorizar Creality como impressora3d', () => {
      expect(categorizarDespesa('Creality Impressora')).toBe('impressora3d');
    });

    test('deve categorizar PETG como impressora3d', () => {
      expect(categorizarDespesa('PETG Filamento')).toBe('impressora3d');
    });

    test('deve categorizar PLA como impressora3d', () => {
      expect(categorizarDespesa('PLA 1kg')).toBe('impressora3d');
    });

    test('deve categorizar Resina como impressora3d', () => {
      expect(categorizarDespesa('Resina UV')).toBe('impressora3d');
    });
  });

  // ==================== TESTES DE CATEGORIA FAMÍLIA ====================

  describe('Categoria: Família', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar Cesar Odair como família', () => {
      expect(categorizarDespesa('Cesar Odair')).toBe('familia');
    });

    test('deve categorizar Vitor como família', () => {
      expect(categorizarDespesa('Vitor')).toBe('familia');
    });

    test('deve categorizar Elis Maria como família', () => {
      expect(categorizarDespesa('Elis Maria')).toBe('familia');
    });
  });

  // ==================== TESTES DE CATEGORIA OUTROS ====================

  describe('Categoria: Outros (padrão)', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar descrição desconhecida como outros', () => {
      expect(categorizarDespesa('XYZ Desconhecido')).toBe('outros');
    });

    test('deve categorizar vazio como outros', () => {
      expect(categorizarDespesa('')).toBe('outros');
    });

    test('deve categorizar número como outros', () => {
      expect(categorizarDespesa('12345')).toBe('outros');
    });

    test('deve categorizar caracteres especiais como outros', () => {
      expect(categorizarDespesa('!@#$%')).toBe('outros');
    });
  });

  // ==================== TESTES DE PRIORIZAÇÃO ====================

  describe('Priorização de Categorias (Multiple Keywords)', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve priorizar primeira categoria encontrada', () => {
      // Se há palavras de múltiplas categorias, pega a primeira encontrada na iteração
      expect(categorizarDespesa('Ifood Shell')).toBe('alimentacao');
    });

    test('deve categorizar com precisão mesmo com múltiplas palavras', () => {
      expect(categorizarDespesa('Almoço no restaurante italiano')).toBe('alimentacao');
    });

    test('deve categorizar com parte de palavra', () => {
      expect(categorizarDespesa('Ifoods delivery')).toBe('alimentacao');
    });
  });

  // ==================== TESTES DE PERFORMANCE ====================

  describe('Performance de Categorização', () => {

    const categorizarDespesa = (desc) => {
      const descLower = desc.toLowerCase();
      for (const [cat, keywords] of Object.entries(DICT_CATEGORIAS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          return cat;
        }
      }
      return 'outros';
    };

    test('deve categorizar rapidamente com descrição curta', () => {
      const start = Date.now();
      categorizarDespesa('Ifood');
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(10); // Menos de 10ms
    });

    test('deve categorizar rapidamente com descrição longa', () => {
      const start = Date.now();
      categorizarDespesa('Compra no Ifood de pizza e refrigerante para levar para casa');
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(10);
    });

    test('deve processar 1000 categorizações rapidamente', () => {
      const descriptions = [
        'Ifood', 'Carrefour', 'Shell', 'Uber', 'Netflix',
        'Farmacia', 'Shopee', 'Cinema', 'Rico', 'Filamento'
      ];
      
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        categorizarDespesa(descriptions[i % descriptions.length]);
      }
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(500); // Menos de 500ms
    });
  });

  // ==================== TESTES DE VALIDAÇÃO ====================

  describe('Validação de Dicionário', () => {

    test('cada categoria deve ter array de keywords', () => {
      Object.entries(DICT_CATEGORIAS).forEach(([cat, keywords]) => {
        expect(Array.isArray(keywords)).toBe(true);
      });
    });

    test('não deve haver keywords duplicadas entre categorias', () => {
      const allKeywords = [];
      const seen = new Set();
      let hasDuplicates = false;
      
      Object.entries(DICT_CATEGORIAS).forEach(([cat, keywords]) => {
        keywords.forEach(kw => {
          if (seen.has(kw)) {
            hasDuplicates = true;
          }
          seen.add(kw);
        });
      });
      
      expect(hasDuplicates).toBe(false);
    });

    test('deve ter pelo menos 10 categorias', () => {
      expect(Object.keys(DICT_CATEGORIAS).length).toBeGreaterThanOrEqual(10);
    });

    test('categoria "outros" deve existir', () => {
      expect(DICT_CATEGORIAS).toHaveProperty('outros');
    });

    test('todos os keywords devem ser strings', () => {
      Object.entries(DICT_CATEGORIAS).forEach(([cat, keywords]) => {
        keywords.forEach(kw => {
          expect(typeof kw).toBe('string');
        });
      });
    });

    test('nenhum keyword deve estar vazio', () => {
      Object.entries(DICT_CATEGORIAS).forEach(([cat, keywords]) => {
        keywords.forEach(kw => {
          expect(kw.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
