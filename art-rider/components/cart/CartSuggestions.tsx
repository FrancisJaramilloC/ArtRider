"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getCartSuggestions, type CartSuggestion } from "@/services/cartSuggestionsService";

interface CartSuggestionsProps {
  cartListingIds: string[];
  startDate: string | null;
  endDate: string | null;
}

export default function CartSuggestions({ cartListingIds, startDate, endDate }: CartSuggestionsProps) {
  const cart = useCart();
  const [suggestions, setSuggestions] = useState<CartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    async function fetchSuggestions() {
      if (cartListingIds.length === 0) {
        if (mounted) setSuggestions([]);
        return;
      }
      
      setLoading(true);
      try {
        const data = await getCartSuggestions(cartListingIds);
        if (mounted) {
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Error fetching cart suggestions:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSuggestions();
    
    return () => {
      mounted = false;
    };
  }, [cartListingIds.join(',')]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#875B9A]" />
        <h2 className="text-xl font-bold text-gray-900">Complementa tu experiencia</h2>
      </div>
      
      <div className="flex overflow-x-auto pb-4 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 hide-scrollbar">
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.listingId}
            className="flex-none w-[280px] md:w-auto bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col"
          >
            <div className="flex p-3 gap-3">
              <div className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {suggestion.coverImageUrl ? (
                  <Image 
                    src={suggestion.coverImageUrl} 
                    alt={suggestion.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    Sin foto
                  </div>
                )}
              </div>
              
              <div className="flex flex-col justify-between flex-grow min-w-0">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {suggestion.title}
                  </h3>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    ${(suggestion.dailyPrice / 100).toFixed(2)}/día
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-3 pb-3 flex flex-col justify-between flex-grow">
              <p className="text-xs text-gray-500 italic mb-3 line-clamp-2 min-h-[32px]">
                {suggestion.reason}
              </p>
              
              <button
                onClick={() => cart.addItem({
                  listingId: suggestion.listingId,
                  title: suggestion.title,
                  dailyPrice: suggestion.dailyPrice,
                  quantity: 1,
                  providerId: suggestion.providerId,
                  providerName: suggestion.providerName,
                  coverImageUrl: suggestion.coverImageUrl,
                }, startDate || "", endDate || "")}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-900 text-sm font-semibold rounded-xl transition-colors border border-gray-200"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
