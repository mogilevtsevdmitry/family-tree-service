import { LayoutOptions } from './core/types';

export const defaultOptions: Required<Omit<LayoutOptions, 'rootId'>> = {
  cardW: 220,
  cardH: 250,
  hGap: 40,
  vGap: 80,
  spouseGutter: 30,
  failOnUnknownIds: true,
};
