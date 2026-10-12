import React from 'react';
import { getImageURL } from '../helpers/ImageHelper';
import { IconAlertTriangleFilled, IconCarrot } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useTheme } from '../contexts/ThemeContext';
import { emptyStateIllu } from '../config/emptyStateIllustrations';

const POSMenuItemCompactView = ({ menuItems, selectedCategory, categories, searchQuery, currency, btnOpenVariantAndAddonModal, addItemToCart, promotionDisplay = {} }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const filteredMenuItems = menuItems.filter((menuItem) => menuItem.is_enabled)
    .filter((menuItem) => {
      if (selectedCategory === "all") {
        return !menuItem.category_id || categories.find(category => category.id === menuItem.category_id && category.is_enabled);
      }
      return selectedCategory === menuItem.category_id;
    })
    .filter((menuItem) => {
      if (!searchQuery) {
        return true;
      }
      return menuItem.title.trim().toLowerCase().includes(searchQuery.trim().toLowerCase());
    });

  return (
    <div className='w-full h-full overflow-hidden'>
      {filteredMenuItems.length === 0 ? (
        <div className="flex flex-col justify-center items-center w-full h-full rounded-2xl">
          <img src={emptyStateIllu.pos} alt={t('pos.not_found_img_alt')} className="w-1/4 mb-4" />
          <p className="text-lg text-apax-green font-bold">{t("pos_menu.not_found_title")}</p>
          <p className="text-gray-500">{t("pos_menu.not_found_message")}</p>
          <p className="text-gray-500">{t("pos_menu.not_found_carrot")}</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full z-0 px-4 pb-4 rounded-b-2xl overflow-y-auto h-full content-start'>
        {filteredMenuItems.map((menuItem, i) => {
          const { title, description, id, price, image, category_id, category_title, addons, variants } = menuItem;

          const imageURL = image ? getImageURL(image) : null;
          const promo = promotionDisplay?.[id];
          const displayPrice = promo ? promo.discountedPrice : price;
          const hasVariantOrAddon = variants?.length > 0 || addons?.length > 0;

          const baseRecipeItems = menuItem.recipeItems?.filter(
            (r) => r.variant_id === 0 && r.addon_id === 0
          );

          const isLowStock = baseRecipeItems?.some(
            (r) => parseFloat(r.current_quantity) <= parseFloat(r.min_quantity_threshold)
          );

          const quantitiesPossible = baseRecipeItems.map(r => {
            const currentQty = parseFloat(r.current_quantity || "0");
            const requiredQty = parseFloat(r.recipe_quantity || "1");
            return Math.floor(currentQty / requiredQty);
          });

          const minItemsCanBeMade = quantitiesPossible.length > 0
            ? Math.min(...quantitiesPossible)
            : null;

          return (
            <div
             className='flex flex-col gap-2 h-44 hover:cursor-pointer overflow-hidden border rounded-2xl border-apax-border-green' key={i}
             onClick={() => {
              if (hasVariantOrAddon) {
                btnOpenVariantAndAddonModal(id);
              } else {
                addItemToCart(menuItem);
              }
            }}
            >
              <div>
                <div className='flex items-center justify-center relative w-full flex-shrink-0 h-28 rounded-t-2xl text-apax-text bg-apax-gray border-apax-green-light'>
                  {image ? <img src={imageURL} alt={title} className="w-full h-full absolute top-0 left-0 rounded-t-2xl object-cover" /> : <IconCarrot />}
                  {promo?.badge && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl z-10">
                      {promo.badge}
                    </div>
                  )}
                  {category_title && (
                    <div className="absolute top-0 left-0 text-white bg-apax-green text-xs font-semibold px-2 py-1 rounded-tl-2xl rounded-br-xl">
                      {category_title}
                    </div>
                  )}
                  {isLowStock && (
                    <div className="absolute left-0 bottom-0 bg-amber-50 text-amber-600 text-[10px] font-medium px-1 py-[1px] z-10 w-full flex flex-col items-center gap-[2px] ">
                      <div className="flex items-center gap-1">
                        <IconAlertTriangleFilled size={12} />
                        <span>Low Stock - {minItemsCanBeMade} Qty</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-2 pb-2 flex flex-col w-full flex-grow">
                <div className='text-left flex-grow'>
                  <p className='line-clamp-1 text-ellipsis text-sm font-semibold '>{title}</p>
                  {/* <p className="text-[10px] text-gray-500">{variants?.length > 0 && <span>{variants?.length} {t("pos_menu.variants")}</span>} {addons?.length > 0 && <span>{addons?.length} {t("pos_menu.addons")}</span>}</p> */}
                </div>
                <div>
                  {promo ? (
                    <p className="text-left text-sm mt-1">
                      <span className="line-through opacity-50 mr-1">
                        {currency}
                        {Number(promo.originalPrice).toFixed(2)}
                      </span>
                      <span className="text-apax-green font-bold">
                        {currency}
                        {Number(displayPrice).toFixed(2)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-left text-apax-green font-bold text-sm mt-1">
                      {currency}
                      {price}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};

export default POSMenuItemCompactView;
