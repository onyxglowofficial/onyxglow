import { useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { EditorialImage } from './BrandMark';
import type { CollectionCategory, ProductItem } from '../types';

const CATEGORIES: Array<'All' | CollectionCategory> = [
  'All',
  'Dhaka Collection',
  'Contemporary Ethnic Wear',
  'Kurta Sets',
  'Tops and Skirts',
  'Signature Collection',
];

interface WomenCollectionSectionProps {
  products: ProductItem[];
  isFullPage?: boolean;
  onViewAllWomen?: () => void;
  onAddToBag: (product: ProductItem, size: string, color: string) => void;
  onBuyNow: (product: ProductItem, size: string, color: string) => void;
}

export function WomenCollectionSection({
  products,
  isFullPage = false,
  onViewAllWomen,
  onAddToBag,
  onBuyNow,
}: WomenCollectionSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | CollectionCategory>('All');
  const [activeProduct, setActiveProduct] = useState<ProductItem | null>(null);
  const [chosenSize, setChosenSize] = useState<string>('');
  const [chosenColor, setChosenColor] = useState<string>('');

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const displayedProducts = isFullPage ? filteredProducts : filteredProducts.slice(0, 3);

  const openProductModal = (item: ProductItem) => {
    setActiveProduct(item);
    setChosenSize(item.sizes[0] || 'M');
    setChosenColor(item.colors[0] || 'Obsidian');
  };

  return (
    <section
      id="women"
      className={`bg-[#F5F0E8] text-[#080808] ${isFullPage ? 'pt-32 pb-24 min-h-screen' : 'py-24 md:py-32'}`}
    >
      <div className="max-w-[1320px] mx-auto px-6 sm:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b border-[#080808]/15">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[#77736D]">
              Women&apos;s Archive · Preview Catalogue
            </p>
            <h2 className="font-serif-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#080808] text-balance">
              WOMEN&apos;S COLLECTION
            </h2>
            <p className="text-sm text-[#080808]/75 leading-relaxed">
              Curated category architecture prepared for ONYX GLOW&apos;s inaugural Nepali textile
              releases. Items below are clearly labelled sample placeholders until official garment
              photography and pricing are published.
            </p>
          </div>

          {!isFullPage && onViewAllWomen && (
            <button
              type="button"
              onClick={onViewAllWomen}
              className="inline-flex items-center gap-3 text-xs tracking-[0.24em] uppercase text-[#080808] hover:text-[#B69A5A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Explore Full Women Catalogue</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Interactive Category Tabs */}
        <div className="py-8 flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-[11px] tracking-[0.18em] uppercase whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#080808] text-[#F5F0E8] border-[#080808]'
                    : 'bg-transparent text-[#080808]/75 border-[#080808]/15 hover:border-[#B69A5A]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {displayedProducts.length === 0 ? (
          <div className="border border-[#080808]/15 bg-[#FFFFFF] p-16 text-center space-y-2">
            <p className="font-serif-editorial text-2xl text-[#080808]">
              No items in {selectedCategory} yet
            </p>
            <p className="text-sm text-[#77736D]">
              Collection entries can be added or updated from the House Administration dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedProducts.map((item) => (
              <article
                key={item.id}
                className="group bg-[#FFFFFF] border border-[#080808]/10 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => openProductModal(item)}
                    className="w-full aspect-[3/4] overflow-hidden bg-[#121212] block cursor-pointer"
                  >
                    {item.imageUrl ? (
                      <EditorialImage
                        src={item.imageUrl}
                        alt={item.name}
                        fallbackTitle={item.category}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#121212] flex flex-col items-center justify-center p-8 text-center">
                        <span className="text-[10px] tracking-[0.28em] uppercase text-[#B69A5A]">
                          {item.category}
                        </span>
                        <span className="mt-4 font-serif-editorial text-2xl text-[#F5F0E8]">
                          ONYX GLOW
                        </span>
                        <div className="my-5 w-10 h-px bg-[#B69A5A]/50" />
                        <span className="text-[11px] tracking-[0.2em] uppercase text-[#D8C9A5]/75">
                          Sample Garment Placeholder
                        </span>
                      </div>
                    )}
                  </button>

                  <div className="p-6 space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#77736D]">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.availability}</span>
                    </div>

                    <h3 className="font-serif-editorial text-2xl text-[#080808] leading-snug">
                      <button
                        type="button"
                        onClick={() => openProductModal(item)}
                        className="text-left hover:text-[#B69A5A] transition-colors cursor-pointer"
                      >
                        {item.name}
                      </button>
                    </h3>

                    <p className="text-xs text-[#080808]/70 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-[#080808]/10 flex items-center justify-between gap-4">
                  <span className="text-xs tracking-[0.14em] uppercase text-[#77736D] tabular-nums">
                    {item.priceLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => openProductModal(item)}
                    className="text-[11px] tracking-[0.22em] uppercase text-[#080808] hover:text-[#B69A5A] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {activeProduct && (
        <div
          className="fixed inset-0 z-50 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdp-title"
        >
          <div className="relative w-full max-w-4xl bg-[#F5F0E8] text-[#080808] border border-[#B69A5A]/40 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              aria-label="Close garment details"
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-[#080808] text-[#F5F0E8] flex items-center justify-center hover:bg-[#B69A5A] hover:text-[#080808] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="md:col-span-6 aspect-[3/4] bg-[#121212]">
              {activeProduct.imageUrl ? (
                <EditorialImage
                  src={activeProduct.imageUrl}
                  alt={activeProduct.name}
                  fallbackTitle={activeProduct.category}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center">
                  <span className="text-[11px] tracking-[0.28em] uppercase text-[#B69A5A]">
                    {activeProduct.category}
                  </span>
                  <span className="mt-4 font-serif-editorial text-3xl text-[#F5F0E8]">
                    ONYX GLOW
                  </span>
                  <div className="my-5 w-12 h-px bg-[#B69A5A]/50" />
                  <span className="text-xs tracking-[0.2em] uppercase text-[#D8C9A5]/80">
                    Garment Photography Placeholder
                  </span>
                </div>
              )}
            </div>

            <div className="md:col-span-6 p-8 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#77736D]">
                  <span>{activeProduct.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeProduct.availability}</span>
                </div>

                <h3 id="pdp-title" className="font-serif-editorial text-3xl text-[#080808]">
                  {activeProduct.name}
                </h3>

                <p className="text-sm tracking-[0.14em] uppercase text-[#B69A5A] tabular-nums">
                  {activeProduct.priceLabel}
                </p>

                <p className="text-sm text-[#080808]/80 leading-relaxed">
                  {activeProduct.description}
                </p>

                {/* Size Selector */}
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] tracking-[0.2em] uppercase text-[#77736D]">
                    Available Sizes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setChosenSize(size)}
                        className={`min-w-[44px] px-3 py-2 text-xs tracking-wider border cursor-pointer transition-colors ${
                          chosenSize === size
                            ? 'bg-[#080808] text-[#F5F0E8] border-[#080808]'
                            : 'bg-[#FFFFFF] text-[#080808] border-[#080808]/20 hover:border-[#B69A5A]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selector */}
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] tracking-[0.2em] uppercase text-[#77736D]">
                    Colour Options
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setChosenColor(color)}
                        className={`px-3.5 py-2 text-xs tracking-wider border cursor-pointer transition-colors ${
                          chosenColor === color
                            ? 'bg-[#080808] text-[#F5F0E8] border-[#080808]'
                            : 'bg-[#FFFFFF] text-[#080808] border-[#080808]/20 hover:border-[#B69A5A]'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#080808]/15 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onBuyNow(activeProduct, chosenSize, chosenColor);
                    setActiveProduct(null);
                  }}
                  className="w-full py-3.5 bg-[#080808] hover:bg-[#B69A5A] text-[#F5F0E8] hover:text-[#080808] text-xs tracking-[0.24em] uppercase font-medium transition-colors cursor-pointer"
                >
                  Buy / Order Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddToBag(activeProduct, chosenSize, chosenColor);
                    setActiveProduct(null);
                  }}
                  className="w-full py-3 border border-[#080808]/25 hover:border-[#B69A5A] text-[#080808] text-xs tracking-[0.24em] uppercase font-medium transition-colors cursor-pointer"
                >
                  Add to Selection Bag
                </button>
                <p className="text-[11px] text-[#77736D] text-center">
                  Sign in or create an account to place product orders.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
