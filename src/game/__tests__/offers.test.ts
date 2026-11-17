import { economy } from '@/economy/economy.config';

import { canAfford, offers, payFor } from '../offers';

const mockSpend = jest.fn();
const mockShowRewarded = jest.fn();
jest.mock('@/economy/wallet', () => ({ wallet: () => ({ spend: (...args: unknown[]) => mockSpend(...args) }) }));
jest.mock('@/services/ads', () => ({ ads: { showRewarded: () => mockShowRewarded() } }));

beforeEach(() => {
  mockSpend.mockReset();
  mockShowRewarded.mockReset();
});

describe('yardım teklifleri', () => {
  it('fiyatlar ekonomi ayarından gelir', () => {
    expect(offers.hint).toEqual({ kind: 'hint', price: economy.prices.hint, amount: 1 });
    expect(offers.undo.price).toBe(economy.prices.undoPack);
    expect(offers.undo.amount).toBe(economy.prices.undoPackSize);
  });

  it('bakiye fiyata eşitse yeter, altındaysa ya da borçtaysa yetmez', () => {
    expect(canAfford(offers.hint.price, offers.hint)).toBe(true);
    expect(canAfford(offers.hint.price - 1, offers.hint)).toBe(false);
    expect(canAfford(-10, offers.undo)).toBe(false);
  });

  it('coinle ödeme: cüzdandan fiyat kadar düşer', async () => {
    mockSpend.mockResolvedValue('ok');
    await expect(payFor(offers.hint, 'coins', '7')).resolves.toBe(true);
    expect(mockSpend).toHaveBeenCalledWith(expect.stringMatching(/^hint:7:/), offers.hint.price, 'hint');
    expect(mockShowRewarded).not.toHaveBeenCalled();
  });

  it('coin yetmezse yardım verilmez', async () => {
    mockSpend.mockResolvedValue('insufficient');
    await expect(payFor(offers.undo, 'coins', '7')).resolves.toBe(false);
  });

  it('art arda iki satın alma ayrı harcamalardır', async () => {
    mockSpend.mockResolvedValue('ok');
    await payFor(offers.hint, 'coins', '7');
    await payFor(offers.hint, 'coins', '7');
    expect(mockSpend.mock.calls[0]![0]).not.toBe(mockSpend.mock.calls[1]![0]);
  });

  it('videoyla ödeme: coin düşmez; video yarıda kesilirse yardım verilmez', async () => {
    mockShowRewarded.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(payFor(offers.hint, 'video', '7')).resolves.toBe(true);
    await expect(payFor(offers.hint, 'video', '7')).resolves.toBe(false);
    expect(mockSpend).not.toHaveBeenCalled();
  });
});
