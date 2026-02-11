/**
 * TemplateSelector Component
 * Allows users to select ticket and marker templates during event creation
 * Shows tier-based access, credit purchase options, and visual previews
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Lock, ShoppingCart, Check, Sparkles, MapPin, Star, Crown, Circle, Zap } from 'lucide-react';
import type { UserAvailableTemplate, TicketTemplate, EventMarkerTemplate } from '../../types';
import {
  getUserAvailableTicketTemplates,
  getUserAvailableMarkerTemplates,
  getAllTicketTemplates,
  getAllMarkerTemplates
} from '../../services/templateService';
import { TicketTemplatePreview } from './TicketTemplatePreview';

interface TemplateSelectorProps {
  userId: string;
  userTier: string;
  userCredits?: number;
  templateType: 'ticket' | 'marker';
  ticketType?: 'standard' | 'vip' | 'early_bird';
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
  onPurchase?: (templateId: string, price: number) => void;
  eventDetails?: {
    name?: string;
    date?: string;
    location?: string;
  };
  language?: 'en' | 'et' | 'ru';
}

/**
 * Inline map marker visual preview component
 * Renders a styled marker icon based on marker template properties
 */
const MarkerPreview: React.FC<{ template: EventMarkerTemplate; size?: 'small' | 'medium' }> = ({ 
  template, 
  size = 'small' 
}) => {
  const containerSize = size === 'small' ? 'w-16 h-16' : 'w-20 h-20';
  const iconSize = size === 'small' ? 24 : 32;

  const markerStyle: React.CSSProperties = {
    color: template.marker_color,
    filter: template.glow_effect ? `drop-shadow(0 0 8px ${template.marker_color})` : undefined,
  };

  const getMarkerIcon = () => {
    switch (template.marker_style) {
      case 'pin':
        return <MapPin size={iconSize} style={markerStyle} />;
      case 'circle':
        return <Circle size={iconSize} style={markerStyle} fill={template.marker_color} fillOpacity={0.3} />;
      case 'custom':
        if (template.marker_icon === 'star') return <Star size={iconSize} style={markerStyle} />;
        if (template.marker_icon === 'crown') return <Crown size={iconSize} style={markerStyle} />;
        if (template.marker_icon === 'zap') return <Zap size={iconSize} style={markerStyle} />;
        return <MapPin size={iconSize} style={markerStyle} />;
      default:
        return <MapPin size={iconSize} style={markerStyle} />;
    }
  };

  return (
    <div className={`${containerSize} flex items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50`}>
      <div className={`${template.pulse_effect ? 'animate-pulse' : ''} ${template.bounce_on_hover ? 'hover:scale-110 transition-transform' : ''}`}>
        {getMarkerIcon()}
      </div>
    </div>
  );
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  userId,
  userTier,
  userCredits = 0,
  templateType,
  ticketType = 'standard',
  selectedTemplateId,
  onSelect,
  onPurchase,
  eventDetails,
  language = 'en'
}) => {
  const [templates, setTemplates] = useState<UserAvailableTemplate[]>([]);
  const [fullTicketTemplates, setFullTicketTemplates] = useState<Map<string, TicketTemplate>>(new Map());
  const [fullMarkerTemplates, setFullMarkerTemplates] = useState<Map<string, EventMarkerTemplate>>(new Map());
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [userId, templateType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = templateType === 'ticket' 
        ? await getUserAvailableTicketTemplates(userId)
        : await getUserAvailableMarkerTemplates(userId);
      setTemplates(data);

      // Fetch full template details for visual preview rendering
      if (templateType === 'ticket') {
        const allTemplates = await getAllTicketTemplates();
        const templateMap = new Map<string, TicketTemplate>();
        allTemplates.forEach(t => templateMap.set(t.id, t));
        setFullTicketTemplates(templateMap);
      } else {
        const allMarkers = await getAllMarkerTemplates();
        const markerMap = new Map<string, EventMarkerTemplate>();
        allMarkers.forEach(t => markerMap.set(t.id, t));
        setFullMarkerTemplates(markerMap);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = async (e: React.MouseEvent, template: UserAvailableTemplate) => {
    e.stopPropagation();
    if (!onPurchase) return;
    if (userCredits < template.credit_price) {
      alert(language === 'et' 
        ? `Teil pole piisavalt krediiti. Vaja: ${template.credit_price}, saadaval: ${userCredits}`
        : `Not enough credits. Required: ${template.credit_price}, available: ${userCredits}`
      );
      return;
    }
    setPurchasingId(template.template_id);
    try {
      await onPurchase(template.template_id, template.credit_price);
      // Reload templates to reflect purchase
      await loadTemplates();
    } finally {
      setPurchasingId(null);
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-slate-700 text-slate-300';
      case 'starter': return 'bg-blue-900/50 text-blue-300';
      case 'pro': return 'bg-purple-900/50 text-purple-300';
      case 'premium': return 'bg-amber-900/50 text-amber-300';
      case 'business': return 'bg-yellow-900/50 text-yellow-300';
      case 'enterprise': return 'bg-red-900/50 text-red-300';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  const translations = {
    en: {
      selectTemplate: 'Select Template',
      locked: 'Locked',
      purchase: 'Buy',
      purchaseWithCredits: 'Buy with credits',
      credits: 'credits',
      selected: 'Selected',
      requiresTier: 'Requires',
      tier: 'tier',
      orBuy: 'or buy with credits',
      loading: 'Loading templates...',
      noTemplates: 'No templates available',
      notEnough: 'Not enough credits'
    },
    et: {
      selectTemplate: 'Vali Kujundus',
      locked: 'Lukus',
      purchase: 'Osta',
      purchaseWithCredits: 'Osta krediidiga',
      credits: 'krediiti',
      selected: 'Valitud',
      requiresTier: 'Nõuab',
      tier: 'taset',
      orBuy: 'või osta krediidiga',
      loading: 'Laadimine...',
      noTemplates: 'Kujundusi pole saadaval',
      notEnough: 'Pole piisavalt krediiti'
    },
    ru: {
      selectTemplate: 'Выбрать Шаблон',
      locked: 'Заблокировано',
      purchase: 'Купить',
      purchaseWithCredits: 'Купить за кредиты',
      credits: 'кредитов',
      selected: 'Выбрано',
      requiresTier: 'Требуется',
      tier: 'уровень',
      orBuy: 'или купить за кредиты',
      loading: 'Загрузка...',
      noTemplates: 'Нет доступных шаблонов',
      notEnough: 'Недостаточно кредитов'
    }
  };

  const t = translations[language];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-slate-400">{t.loading}</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500">
        {t.noTemplates}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {t.selectTemplate}
        </h3>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles size={14} />
            {userTier}
          </span>
          {userCredits > 0 && (
            <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
              {userCredits} {t.credits}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.template_id;
          const canAccess = template.has_access;
          const isPurchasable = template.is_premium && !template.is_purchased && !canAccess;
          const canAfford = userCredits >= template.credit_price;
          const fullTicket = fullTicketTemplates.get(template.template_id);
          const fullMarker = fullMarkerTemplates.get(template.template_id);
          const isPurchasing = purchasingId === template.template_id;

          return (
            <div
              key={template.template_id}
              className={`relative border-2 rounded-xl p-4 transition-all ${
                isSelected 
                  ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/20' 
                  : canAccess
                  ? 'border-slate-700 hover:border-indigo-500/50 hover:shadow-md bg-slate-800/50 cursor-pointer'
                  : 'border-slate-700/50 bg-slate-800/30'
              }`}
              onClick={() => canAccess && onSelect(template.template_id)}
            >
              {/* Tier badge */}
              <div className="absolute top-2 right-2 z-10">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(template.required_tier)}`}>
                  {template.required_tier}
                </span>
              </div>

              {/* Ticket template preview - scaled down to prevent overlap */}
              {templateType === 'ticket' && fullTicket && (
                <div className="mb-3 flex justify-center overflow-hidden rounded-lg h-24">
                  <div className="transform scale-[0.45] origin-top">
                    <TicketTemplatePreview
                      template={fullTicket}
                      eventName={eventDetails?.name || 'Event Name'}
                      eventDate={eventDetails?.date}
                      eventLocation={eventDetails?.location}
                      ticketType={ticketType}
                      showDetails={false}
                      size="small"
                    />
                  </div>
                </div>
              )}
              {templateType === 'ticket' && !fullTicket && (
                <div className="mb-3 flex justify-center">
                  <div className="w-full h-20 bg-slate-700/50 rounded-lg flex items-center justify-center">
                    <span className="text-slate-500 text-xs">{template.display_name[language]}</span>
                  </div>
                </div>
              )}

              {/* Marker template preview - visual icon rendering */}
              {templateType === 'marker' && fullMarker && (
                <div className="mb-3 flex justify-center py-2">
                  <MarkerPreview template={fullMarker} size="medium" />
                </div>
              )}
              {templateType === 'marker' && !fullMarker && template.preview_image_url && (
                <div className="mb-3 flex justify-center">
                  <img 
                    src={template.preview_image_url} 
                    alt={template.display_name[language]}
                    className="w-20 h-20 object-contain"
                  />
                </div>
              )}
              {templateType === 'marker' && !fullMarker && !template.preview_image_url && (
                <div className="mb-3 flex justify-center py-2">
                  <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <MapPin size={24} className="text-slate-500" />
                  </div>
                </div>
              )}

              {/* Template info */}
              <div className="text-center">
                <h4 className="font-semibold text-white mb-1 text-sm">
                  {template.display_name[language]}
                </h4>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                  {template.description[language]}
                </p>

                {/* Selected state */}
                {isSelected && (
                  <div className="flex items-center justify-center gap-2 text-indigo-400 font-medium text-sm">
                    <Check size={16} />
                    <span>{t.selected}</span>
                  </div>
                )}

                {/* Locked - show tier requirement + purchase option */}
                {!canAccess && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
                      <Lock size={14} />
                      <span>
                        {t.requiresTier} {template.required_tier} {t.tier}
                      </span>
                    </div>

                    {/* Purchase with credits button */}
                    {isPurchasable && template.credit_price > 0 && onPurchase && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-500">{t.orBuy}</p>
                        <button
                          onClick={(e) => handlePurchaseClick(e, template)}
                          disabled={isPurchasing || !canAfford}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                            isPurchasing 
                              ? 'bg-slate-700 text-slate-400 cursor-wait'
                              : canAfford
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isPurchasing ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                          ) : (
                            <ShoppingCart size={13} />
                          )}
                          <span>
                            {isPurchasing 
                              ? '...'
                              : `${t.purchase} (${template.credit_price} ${t.credits})`
                            }
                          </span>
                        </button>
                        {!canAfford && (
                          <p className="text-[10px] text-amber-400">{t.notEnough}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Accessible but not selected */}
                {canAccess && !isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(template.template_id);
                    }}
                    className="w-full px-3 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
                  >
                    {t.selectTemplate}
                  </button>
                )}
              </div>

              {/* Purchased badge */}
              {template.is_purchased && (
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-900/50 text-green-400">
                    <Check size={10} className="mr-1" />
                    Purchased
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateSelector;
