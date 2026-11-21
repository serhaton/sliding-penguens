import { REVIEW_MILESTONES, shouldAskForReview } from '../reviewPolicy';

describe('puanlama isteği kuralı', () => {
  const [first, second] = REVIEW_MILESTONES;

  it('ilk eşikten önce sorulmaz', () => {
    expect(shouldAskForReview({ levelNumber: first - 1, stars: 3, asked: 0 })).toBe(false);
  });

  it('yalnızca üç yıldızlı bitirişte sorulur', () => {
    expect(shouldAskForReview({ levelNumber: first, stars: 2, asked: 0 })).toBe(false);
    expect(shouldAskForReview({ levelNumber: first, stars: 3, asked: 0 })).toBe(true);
    expect(shouldAskForReview({ levelNumber: first + 5, stars: 3, asked: 0 })).toBe(true);
  });

  it('ikinci istek ikinci eşiği bekler', () => {
    expect(shouldAskForReview({ levelNumber: second - 1, stars: 3, asked: 1 })).toBe(false);
    expect(shouldAskForReview({ levelNumber: second, stars: 3, asked: 1 })).toBe(true);
  });

  it('eşikler bitince bir daha sorulmaz', () => {
    expect(shouldAskForReview({ levelNumber: 90, stars: 3, asked: REVIEW_MILESTONES.length })).toBe(false);
  });
});
