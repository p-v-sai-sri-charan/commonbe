/** One enable-able garment style from the Qikink SKU catalog. */
export interface QikinkStyleColor {
  name: string;
  /** SKU color code, e.g. "Wh" — provider SKU = `${baseSku}-${code}-${size}`. */
  code: string;
  /** Approximate garment hex for the studio canvas / swatches. */
  hex: string;
}

export interface QikinkStyle {
  /** Stable slug, e.g. "male-classic-crew-t-shirt". Stored on Product.styleKey. */
  styleKey: string;
  gender: 'Male' | 'Female' | 'Boy' | 'Girl' | 'Kids' | 'Unisex';
  name: string;
  displayName: string;
  /** tshirt | polo | hoodie | sweatshirt | tank | crop_top | dress | skirt | shorts | joggers | jacket | romper | kaftan | shirt | other */
  garmentType: string;
  printTypeId: number;
  baseSku: string;
  /** Qikink's cost price (max across sizes) — reference for setting retail margin. */
  qikinkBasePriceRupees: number;
  colors: QikinkStyleColor[];
  sizes: string[];
}
