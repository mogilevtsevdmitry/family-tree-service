import { LayoutOptions } from './core/types';

export const defaultOptions: Required<Omit<LayoutOptions, 'rootId'>> = {
  cardW: 220,
  cardH: 250,
  hGap: 90,
  vGap: 150,
  spouseGutter: 30,
  failOnUnknownIds: true,
};
