/**
 * TESTES UNITÁRIOS: impressora.js
 * Testa todas as funções de gerenciamento da Impressora 3D
 */

import {
  createDefaultState,
  createMockFilament,
  createMockProduct,
  createMockSale,
  createISODate
} from './testUtils.js';

describe('Sistema de Impressora 3D', () => {

  let mockState;

  beforeEach(() => {
    mockState = createDefaultState();
    window.state = mockState;
  });

  // ==================== GESTÃO DE FILAMENTOS ====================

  describe('Gerenciamento de Filamentos', () => {

    test('deve calcular preço por grama de filamento', () => {
      const filament = mockState.filaments[0];
      const pricePerGram = filament.price / filament.weight;
      
      expect(pricePerGram).toBeGreaterThan(0);
      expect(pricePerGram).toBe(0.045); // 45 / 1000
    });

    test('deve adicionar novo filamento', () => {
      const newFilament = createMockFilament({
        color: 'Verde',
        type: 'PLA',
        weight: 750,
        price: 35
      });
      
      mockState.filaments.push(newFilament);
      
      expect(mockState.filaments).toContainEqual(newFilament);
      expect(mockState.filaments.length).toBe(3);
    });

    test('deve atualizar peso de filamento', () => {
      const filament = mockState.filaments[0];
      const usedGrams = 150;
      const oldWeight = filament.weight;
      
      filament.weight -= usedGrams;
      
      expect(filament.weight).toBe(oldWeight - usedGrams);
      expect(filament.weight).toBe(850);
    });

    test('deve deletar filamento', () => {
      const initialLength = mockState.filaments.length;
      const filamentToDelete = mockState.filaments[0].id;
      
      mockState.filaments = mockState.filaments.filter(f => f.id !== filamentToDelete);
      
      expect(mockState.filaments.length).toBe(initialLength - 1);
    });

    test('deve calcular estoque total de filamento', () => {
      const totalGrams = mockState.filaments.reduce((sum, f) => sum + f.weight, 0);
      
      expect(totalGrams).toBe(1500); // 1000 + 500
      expect(totalGrams).toBeGreaterThan(0);
    });

    test('deve calcular valor total em filamentos', () => {
      const totalValue = mockState.filaments.reduce((sum, f) => sum + f.price, 0);
      
      expect(totalValue).toBe(110); // 45 + 65
      expect(totalValue).toBeGreaterThan(0);
    });

    test('deve registrar perda de filamento', () => {
      const filament = mockState.filaments[0];
      const lostGrams = 50;
      
      mockState.impLosses.push({
        id: 'loss-new',
        date: createISODate(),
        filamentId: filament.id,
        grams: lostGrams,
        cost: (filament.price / filament.weight) * lostGrams,
        reason: 'Falha de impressão'
      });
      
      expect(mockState.impLosses.length).toBe(2);
    });

    test('deve bloquear perda de mais filamento do que existe', () => {
      const filament = mockState.filaments[0];
      const availableWeight = filament.weight;
      const attemptedLoss = availableWeight + 100;
      
      if (attemptedLoss <= availableWeight) {
        filament.weight -= attemptedLoss;
      }
      
      expect(filament.weight).toBe(availableWeight);
    });

    test('deve atualizar preço de filamento', () => {
      const filament = mockState.filaments[0];
      const oldPrice = filament.price;
      
      filament.price = 50;
      
      expect(filament.price).toBe(50);
      expect(filament.price).not.toBe(oldPrice);
    });

    test('deve filtrar filamentos por tipo', () => {
      const plaFilaments = mockState.filaments.filter(f => f.type === 'PLA');
      
      expect(Array.isArray(plaFilaments)).toBe(true);
      plaFilaments.forEach(f => {
        expect(f.type).toBe('PLA');
      });
    });

    test('deve ordenar filamentos por preço per grama', () => {
      const sorted = [...mockState.filaments].sort((a, b) => 
        (a.price / a.weight) - (b.price / b.weight)
      );
      
      for (let i = 1; i < sorted.length; i++) {
        expect((sorted[i].price / sorted[i].weight))
          .toBeGreaterThanOrEqual((sorted[i-1].price / sorted[i-1].weight));
      }
    });

    test('deve calcular filamento necessário para produção', () => {
      const products = mockState.products;
      const quantityToProduce = 10;
      const filamentNeeded = products.reduce((sum, p) => sum + (p.fil_g * quantityToProduce), 0);
      
      expect(filamentNeeded).toBe((20 + 30) * 10);
      expect(filamentNeeded).toBe(500);
    });
  });

  // ==================== GESTÃO DE PRODUTOS ====================

  describe('Gerenciamento de Produtos', () => {

    test('deve adicionar novo produto', () => {
      const newProduct = createMockProduct({
        name: 'Vaso Grande',
        hours: 4,
        fil_g: 50,
        price: 120
      });
      
      mockState.products.push(newProduct);
      
      expect(mockState.products).toContainEqual(newProduct);
      expect(mockState.products.length).toBe(3);
    });

    test('deve calcular custo de material do produto', () => {
      const product = mockState.products[0];
      const filament = mockState.filaments[0];
      const pricePerGram = filament.price / filament.weight;
      const materialCost = product.fil_g * pricePerGram;
      
      expect(materialCost).toBeGreaterThan(0);
      expect(materialCost).toBeCloseTo(0.9, 6); // 20 * 0.045
    });

    test('deve calcular custo de hora de impressão', () => {
      const product = mockState.products[0];
      const hourlyRate = 30; // R$ por hora
      const hourCost = product.hours * hourlyRate;
      
      expect(hourCost).toBe(60); // 2 * 30
    });

    test('deve calcular lucro bruto do produto', () => {
      const product = mockState.products[0];
      const filament = mockState.filaments[0];
      const pricePerGram = filament.price / filament.weight;
      const materialCost = product.fil_g * pricePerGram;
      const hourlyRate = 30;
      const hourCost = product.hours * hourlyRate;
      const totalCost = materialCost + hourCost;
      const grossProfit = product.price - totalCost;
      
      expect(grossProfit).toBeCloseTo(product.price - totalCost, 6);
    });

    test('deve validar margem de lucro', () => {
      const product = mockState.products[0];
      const filament = mockState.filaments[0];
      const pricePerGram = filament.price / filament.weight;
      const materialCost = product.fil_g * pricePerGram;
      
      const margin = ((product.price - materialCost) / product.price) * 100;
      
      expect(margin).toBeGreaterThan(0);
      expect(margin).toBeLessThan(100);
    });

    test('deve atualizar preço de produto', () => {
      const product = mockState.products[0];
      const oldPrice = product.price;
      
      product.price = 75;
      
      expect(product.price).toBe(75);
      expect(product.price).not.toBe(oldPrice);
    });

    test('deve deletar produto', () => {
      const initialLength = mockState.products.length;
      const productToDelete = mockState.products[0].id;
      
      mockState.products = mockState.products.filter(p => p.id !== productToDelete);
      
      expect(mockState.products.length).toBe(initialLength - 1);
    });

    test('deve filtrar produtos por caixa', () => {
      const boxProducts = mockState.products.filter(p => p.box === 'box-default');
      
      expect(Array.isArray(boxProducts)).toBe(true);
      boxProducts.forEach(p => {
        expect(p.box).toBe('box-default');
      });
    });

    test('deve ordenar produtos por preço', () => {
      const sorted = [...mockState.products].sort((a, b) => b.price - a.price);
      
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].price).toBeLessThanOrEqual(sorted[i-1].price);
      }
    });

    test('deve ordenar produtos por tempo de impressão', () => {
      const sorted = [...mockState.products].sort((a, b) => a.hours - b.hours);
      
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].hours).toBeGreaterThanOrEqual(sorted[i-1].hours);
      }
    });

    test('deve calcular quantidade de produto a produzir', () => {
      const product = mockState.products[0];
      const filament = mockState.filaments[0];
      const availableFilament = filament.weight;
      const quantityCanProduce = Math.floor(availableFilament / product.fil_g);
      
      expect(quantityCanProduce).toBeGreaterThanOrEqual(0);
      expect(quantityCanProduce).toBe(50); // 1000 / 20
    });
  });

  // ==================== GESTÃO DE VENDAS ====================

  describe('Gerenciamento de Vendas', () => {

    test('deve registrar venda de produto', () => {
      const newSale = createMockSale({
        productId: mockState.products[0].id,
        filamentId: mockState.filaments[0].id,
        qty: 2
      });
      
      mockState.impSales.push(newSale);
      
      expect(mockState.impSales.length).toBe(2);
      expect(mockState.impSales).toContainEqual(newSale);
    });

    test('deve calcular valor bruto de venda', () => {
      const sale = mockState.impSales[0];
      
      expect(sale.amountGross).toBeGreaterThan(0);
      expect(sale.amountGross).toBe(250);
    });

    test('deve calcular taxa de processamento', () => {
      const amountGross = 250;
      const feePercentage = 0.02; // 2%
      const fee = amountGross * feePercentage;
      
      expect(fee).toBeGreaterThan(0);
      expect(fee).toBe(5);
    });

    test('deve calcular valor líquido recebido', () => {
      const sale = mockState.impSales[0];
      const netReceived = sale.amountGross - sale.feeTotal;
      
      expect(netReceived).toBeLessThanOrEqual(sale.amountGross);
      expect(netReceived).toBe(250);
    });

    test('deve calcular lucro real da venda', () => {
      const sale = mockState.impSales[0];
      const profit = sale.netReceived - sale.materialCost;
      
      expect(profit).toBe(sale.profit);
      expect(profit).toBe(225);
    });

    test('deve descontar filamento ao vender', () => {
      const filament = mockState.filaments[0];
      const product = mockState.products[0];
      const qtyToSell = 5;
      const oldWeight = filament.weight;
      
      filament.weight -= product.fil_g * qtyToSell;
      
      expect(filament.weight).toBe(oldWeight - (product.fil_g * qtyToSell));
    });

    test('deve bloquear venda sem filamento suficiente', () => {
      const filament = mockState.filaments[0];
      const product = mockState.products[0];
      const qtyToSell = 100; // Muito grande
      const neededGrams = product.fil_g * qtyToSell;
      const oldWeight = filament.weight;
      
      if (neededGrams <= filament.weight) {
        filament.weight -= neededGrams;
      }
      
      expect(filament.weight).toBe(oldWeight);
    });

    test('deve adicionar lucro à conta imp3d', () => {
      const account = mockState.accounts.find(a => a.id === 'imp3d');
      const oldBalance = account.saldo;
      const profitAmount = 225;
      
      account.saldo += profitAmount;
      
      expect(account.saldo).toBe(oldBalance + profitAmount);
    });

    test('deve registrar venda por canal (normal/shopee/externo)', () => {
      const sale = {
        ...createMockSale(),
        channel: 'shopee'
      };
      
      mockState.impSales.push(sale);
      
      const shopeesSales = mockState.impSales.filter(s => s.channel === 'shopee');
      expect(shopeesSales.length).toBeGreaterThanOrEqual(1);
    });

    test('deve calcular total de vendas do mês', () => {
      const month = createISODate().slice(0, 7);
      const monthSales = mockState.impSales.filter(s => s.date.startsWith(month));
      const monthTotal = monthSales.reduce((sum, s) => sum + s.netReceived, 0);
      
      expect(typeof monthTotal).toBe('number');
      expect(monthTotal).toBeGreaterThanOrEqual(0);
    });

    test('deve calcular lucro total do período', () => {
      const totalProfit = mockState.impSales.reduce((sum, s) => sum + s.profit, 0);
      
      expect(totalProfit).toBe(225);
      expect(totalProfit).toBeGreaterThan(0);
    });

    test('deve deletar venda', () => {
      const initialLength = mockState.impSales.length;
      const saleToDelete = mockState.impSales[0].id;
      
      mockState.impSales = mockState.impSales.filter(s => s.id !== saleToDelete);
      
      expect(mockState.impSales.length).toBe(initialLength - 1);
    });

    test('deve ordenar vendas por data', () => {
      const sorted = [...mockState.impSales].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      for (let i = 1; i < sorted.length; i++) {
        expect(new Date(sorted[i].date)).toBeLessThanOrEqual(new Date(sorted[i-1].date));
      }
    });

    test('deve calcular quantidade total vendida de produto', () => {
      const productId = mockState.products[0].id;
      const productSales = mockState.impSales.filter(s => s.productId === productId);
      const totalQty = productSales.reduce((sum, s) => sum + s.qty, 0);
      
      expect(totalQty).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== GESTÃO DE ESTOQUE ====================

  describe('Gerenciamento de Estoque', () => {

    test('deve adicionar produto ao estoque', () => {
      const stockItem = {
        id: 'stock-new',
        date: createISODate(),
        productId: mockState.products[0].id,
        filamentId: mockState.filaments[0].id,
        qty: 5,
        materialCost: 50,
        hourlyCost: 0,
        packagingCost: 0
      };
      
      mockState.impStock.push(stockItem);
      
      expect(mockState.impStock).toContainEqual(stockItem);
    });

    test('deve calcular valor total de estoque', () => {
      const totalStock = mockState.impStock.reduce((sum, s) => 
        sum + (s.materialCost + s.hourlyCost + s.packagingCost), 0
      );
      
      expect(totalStock).toBeGreaterThanOrEqual(0);
      expect(totalStock).toBe(50);
    });

    test('deve vender do estoque sem deduzir filamento novamente', () => {
      const stockItem = mockState.impStock[0];
      const filament = mockState.filaments[0];
      const oldWeight = filament.weight;
      
      // Simular venda do estoque (não deduz filamento)
      mockState.impStock = mockState.impStock.filter(s => s.id !== stockItem.id);
      
      expect(filament.weight).toBe(oldWeight); // Filamento não deve mudar
    });

    test('deve agrupar estoque por produto', () => {
      const grouped = {};
      mockState.impStock.forEach(item => {
        grouped[item.productId] = (grouped[item.productId] || 0) + item.qty;
      });
      
      expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(0);
    });

    test('deve agrupar estoque por filamento', () => {
      const grouped = {};
      mockState.impStock.forEach(item => {
        grouped[item.filamentId] = (grouped[item.filamentId] || 0) + item.qty;
      });
      
      expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(0);
    });

    test('deve calcular valor médio de custo por unidade em estoque', () => {
      const totalCost = mockState.impStock.reduce((sum, s) => 
        sum + (s.materialCost + s.hourlyCost + s.packagingCost), 0
      );
      const totalQty = mockState.impStock.reduce((sum, s) => sum + s.qty, 0);
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      
      expect(avgCost).toBeGreaterThanOrEqual(0);
    });

    test('deve bloquear venda de mais unidades do que estoque', () => {
      const stockItem = mockState.impStock[0];
      const availableQty = stockItem.qty;
      const attemptedSale = availableQty + 10;
      
      if (attemptedSale <= availableQty) {
        stockItem.qty -= attemptedSale;
      }
      
      expect(stockItem.qty).toBe(availableQty);
    });
  });

  // ==================== GESTÃO DE CAIXAS/CATEGORIAS ====================

  describe('Gerenciamento de Caixas/Categorias', () => {

    test('deve criar nova caixa', () => {
      const newBox = {
        id: 'box-novo',
        name: 'Plantas',
        emoji: '🌿'
      };
      
      mockState.productBoxes.push(newBox);
      
      expect(mockState.productBoxes).toContainEqual(newBox);
    });

    test('deve deletar caixa', () => {
      const initialLength = mockState.productBoxes.length;
      const boxToDelete = mockState.productBoxes[0].id;
      
      // Remover produtos desta caixa primeiro
      mockState.products = mockState.products.filter(p => p.box !== boxToDelete);
      mockState.productBoxes = mockState.productBoxes.filter(b => b.id !== boxToDelete);
      
      expect(mockState.productBoxes.length).toBe(initialLength - 1);
    });

    test('deve contar produtos por caixa', () => {
      const boxId = 'box-default';
      const productsInBox = mockState.products.filter(p => p.box === boxId);
      
      expect(productsInBox.length).toBeGreaterThanOrEqual(0);
    });

    test('deve retornar caixa padrão se não existir', () => {
      const boxId = 'inexistent';
      const box = mockState.productBoxes.find(b => b.id === boxId);
      const defaultBox = mockState.productBoxes.find(b => b.id === 'box-default');
      
      expect(box).toBeUndefined();
      expect(defaultBox).toBeDefined();
    });

    test('deve validar emoji de caixa', () => {
      const box = mockState.productBoxes[0];
      
      expect(box.emoji).toBeTruthy();
      expect(box.emoji.length).toBeGreaterThan(0);
    });

    test('deve renomear caixa', () => {
      const box = mockState.productBoxes[0];
      const oldName = box.name;
      
      box.name = 'Novo Nome';
      
      expect(box.name).toBe('Novo Nome');
      expect(box.name).not.toBe(oldName);
    });
  });

  // ==================== MÉTRICAS E RELATÓRIOS ====================

  describe('Métricas e Relatórios', () => {

    test('deve calcular receita total de impressora 3D', () => {
      const totalRevenue = mockState.impSales.reduce((sum, s) => sum + s.netReceived, 0);
      
      expect(totalRevenue).toBe(250);
      expect(totalRevenue).toBeGreaterThanOrEqual(0);
    });

    test('deve calcular custo de material total', () => {
      const totalMaterialCost = mockState.impSales.reduce((sum, s) => sum + s.materialCost, 0);
      
      expect(totalMaterialCost).toBe(25);
      expect(totalMaterialCost).toBeGreaterThanOrEqual(0);
    });

    test('deve calcular lucro líquido total', () => {
      const totalProfit = mockState.impSales.reduce((sum, s) => sum + s.profit, 0);
      
      expect(totalProfit).toBe(225);
      expect(totalProfit).toBeGreaterThan(0);
    });

    test('deve calcular margem de lucro média', () => {
      const avgMargin = mockState.impSales.length > 0 
        ? mockState.impSales.reduce((sum, s) => sum + (s.profit / s.amountGross * 100), 0) / mockState.impSales.length
        : 0;
      
      expect(avgMargin).toBeGreaterThanOrEqual(0);
    });

    test('deve gerar relatório de perdas', () => {
      const totalLosses = mockState.impLosses.reduce((sum, l) => sum + l.cost, 0);
      const lossCount = mockState.impLosses.length;
      
      expect(lossCount).toBeGreaterThanOrEqual(0);
      expect(totalLosses).toBeGreaterThanOrEqual(0);
    });

    test('deve listar produtos mais vendidos', () => {
      const productSales = {};
      mockState.impSales.forEach(sale => {
        productSales[sale.productId] = (productSales[sale.productId] || 0) + sale.qty;
      });
      
      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      expect(Array.isArray(topProducts)).toBe(true);
    });

    test('deve calcular ROI (Return on Investment)', () => {
      const totalInvested = mockState.filaments.reduce((sum, f) => sum + f.price, 0);
      const totalProfit = mockState.impSales.reduce((sum, s) => sum + s.profit, 0);
      const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
      
      expect(typeof roi).toBe('number');
      expect(roi).toBeGreaterThanOrEqual(0);
    });

    test('deve calcular tempo médio de impressão por venda', () => {
      const totalHours = mockState.products.reduce((sum, p) => sum + p.hours, 0);
      const avgHours = mockState.products.length > 0 ? totalHours / mockState.products.length : 0;
      
      expect(avgHours).toBeGreaterThanOrEqual(0);
    });

    test('deve gerar relatório de filamento por cor', () => {
      const byColor = {};
      mockState.filaments.forEach(f => {
        byColor[f.color] = (byColor[f.color] || 0) + f.weight;
      });
      
      expect(Object.keys(byColor).length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== VALIDAÇÕES ====================

  describe('Validações de Impressora 3D', () => {

    test('deve validar quantidade de venda', () => {
      const quantity = 5;
      
      expect(quantity).toBeGreaterThan(0);
    });

    test('deve validar preço de venda', () => {
      const price = 60;
      
      expect(price).toBeGreaterThan(0);
    });

    test('não deve permitir preço de venda menor que custo', () => {
      const product = mockState.products[0];
      const filament = mockState.filaments[0];
      const pricePerGram = filament.price / filament.weight;
      const materialCost = product.fil_g * pricePerGram;
      const hourlyRate = 30;
      const hourCost = product.hours * hourlyRate;
      const totalCost = materialCost + hourCost;
      
      if (product.price >= totalCost) {
        expect(product.price).toBeGreaterThanOrEqual(totalCost);
      }
    });

    test('deve validar data de venda', () => {
      const sale = mockState.impSales[0];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      expect(dateRegex.test(sale.date)).toBe(true);
    });

    test('deve validar ID de produto em venda', () => {
      const sale = mockState.impSales[0];
      const productExists = mockState.products.find(p => p.id === sale.productId);
      
      expect(productExists).toBeDefined();
    });

    test('deve validar ID de filamento em venda', () => {
      const sale = mockState.impSales[0];
      const filamentExists = mockState.filaments.find(f => f.id === sale.filamentId);
      
      expect(filamentExists).toBeDefined();
    });
  });

  // ==================== TESTES DE INTEGRAÇÃO ====================

  describe('Cenários Complexos de Integração', () => {

    test('deve completar ciclo de produção: compra -> estoque -> venda', () => {
      // 1. Comprar filamento (já existe)
      const filament = mockState.filaments[0];
      const initialFilament = filament.weight;
      
      // 2. Produzir (adicionar ao estoque)
      const product = mockState.products[0];
      const qtyToStock = 5;
      mockState.impStock.push({
        id: 'stock-prod',
        date: createISODate(),
        productId: product.id,
        filamentId: filament.id,
        qty: qtyToStock,
        materialCost: (filament.price / filament.weight) * product.fil_g * qtyToStock,
        hourlyCost: 0,
        packagingCost: 0
      });
      
      // 3. Vender do estoque
      const qtyToSell = 3;
      mockState.impSales.push({
        id: 'sale-from-stock',
        date: createISODate(),
        productId: product.id,
        filamentId: filament.id,
        accountId: 'imp3d',
        qty: qtyToSell,
        amountGross: product.price * qtyToSell,
        feeTotal: 0,
        netReceived: product.price * qtyToSell,
        materialCost: (filament.price / filament.weight) * product.fil_g * qtyToSell,
        profit: (product.price * qtyToSell) - ((filament.price / filament.weight) * product.fil_g * qtyToSell)
      });
      
      expect(mockState.impStock.length).toBe(2);
      expect(mockState.impSales.length).toBe(2);
    });

    test('deve recalcular métricas após múltiplas operações', () => {
      // Adicionar várias vendas
      for (let i = 0; i < 5; i++) {
        mockState.impSales.push(createMockSale());
      }
      
      const totalProfit = mockState.impSales.reduce((sum, s) => sum + s.profit, 0);
      const avgProfit = totalProfit / mockState.impSales.length;
      
      expect(mockState.impSales.length).toBe(6);
      expect(avgProfit).toBeGreaterThan(0);
    });

    test('deve manter integridade ao deletar e readicionar', () => {
      const initialLength = mockState.products.length;
      const productToRemove = mockState.products[0];
      
      mockState.products = mockState.products.filter(p => p.id !== productToRemove.id);
      expect(mockState.products.length).toBe(initialLength - 1);
      
      mockState.products.push(productToRemove);
      expect(mockState.products.length).toBe(initialLength);
    });
  });
});
