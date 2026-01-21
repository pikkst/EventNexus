/**
 * TemplateSelector Component
 * Allows users to select ticket and marker templates during event creation
 * Shows tier-based access and purchase options
 */

import React, { useState, useEffect } from 'react';
import { Lock, ShoppingCart, Check, Sparkles } from 'lucide-react';
import type { UserAvailableTemplate } from '../../types';
import { getUserAvailableTicketTemplates, getUserAvailableMarkerTemplates } from '../../services/templateService';
import { TicketTemplatePreview } from './TicketTemplatePreview';

interface TemplateSelectorProps {
  userId: string;
  userTier: string;
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

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  userId,
  userTier,
  templateType,
  ticketType = 'standard',
  selectedTemplateId,
  onSelect,
  onPurchase,
  eventDetails,
  language = 'en'
}) => {
  const [templates, setTemplates] = useState<UserAvailableTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

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
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (template: UserAvailableTemplate) => {
    if (onPurchase) {
      onPurchase(template.template_id, template.credit_price);
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-100 text-gray-700';
      case 'starter': return 'bg-blue-100 text-blue-700';
      case 'pro': return 'bg-purple-100 text-purple-700';
      case 'business': return 'bg-yellow-100 text-yellow-700';
      case 'enterprise': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const translations = {
    en: {
      selectTemplate: 'Select Template',
      locked: 'Locked',
      purchase: 'Purchase',
      credits: 'credits',
      selected: 'Selected',
      requiresTier: 'Requires',
      tier: 'tier',
      loading: 'Loading templates...',
      noTemplates: 'No templates available'
    },
    et: {
      selectTemplate: 'Vali Kujundus',
      locked: 'Lukus',
      purchase: 'Osta',
      credits: 'krediiti',
      selected: 'Valitud',
      requiresTier: 'Nõuab',
      tier: 'taset',
      loading: 'Laadimine...',
      noTemplates: 'Kujundusi pole saadaval'
    },
    ru: {
      selectTemplate: 'Выбрать Шаблон',
      locked: 'Заблокировано',
      purchase: 'Купить',
      credits: 'кредитов',
      selected: 'Выбрано',
      requiresTier: 'Требуется',
      tier: 'уровень',
      loading: 'Загрузка...',
      noTemplates: 'Нет доступных шаблонов'
    }
  };

  const t = translations[language];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">{t.loading}</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        {t.noTemplates}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t.selectTemplate}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Sparkles size={16} />
          <span>Your tier: {userTier}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.template_id;
          const canAccess = template.has_access;
          const isPremium = template.is_premium && !template.is_purchased;

          return (
            <div
              key={template.template_id}
              className={`relative border-2 rounded-lg p-4 transition-all cursor-pointer ${
                isSelected 
                  ? 'border-indigo-600 bg-indigo-50 shadow-lg' 
                  : canAccess
                  ? 'border-gray-200 hover:border-indigo-400 hover:shadow-md'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
              onMouseEnter={() => setHoveredTemplate(template.template_id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              onClick={() => canAccess && onSelect(template.template_id)}
            >
              {/* Tier badge */}
              <div className="absolute top-2 right-2 z-10">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(template.required_tier)}`}>
                  {template.required_tier}
                </span>
              </div>

              {/* Template preview */}
              {templateType === 'ticket' && (
                <div className="mb-3 flex justify-center">
                  <TicketTemplatePreview
                    template={{ 
                      id: template.template_id,
                      name: template.name,
                      ...template 
                    } as any}
                    eventName={eventDetails?.name}
                    eventDate={eventDetails?.date}
                    eventLocation={eventDetails?.location}
                    ticketType={ticketType}
                    showDetails={hoveredTemplate === template.template_id}
                    size="small"
                  />
                </div>
              )}

              {templateType === 'marker' && template.preview_image_url && (
                <div className="mb-3 flex justify-center">
                  <img 
                    src={template.preview_image_url} 
                    alt={template.display_name[language]}
                    className="w-24 h-24 object-contain"
                  />
                </div>
              )}

              {/* Template info */}
              <div className="text-center">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {template.display_name[language]}
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  {template.description[language]}
                </p>

                {/* Access status */}
                {isSelected && (
                  <div className="flex items-center justify-center gap-2 text-indigo-600 font-medium">
                    <Check size={16} />
                    <span>{t.selected}</span>
                  </div>
                )}

                {!canAccess && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Lock size={16} />
                      <span className="text-sm">
                        {t.requiresTier} {template.required_tier} {t.tier}
                      </span>
                    </div>

                    {isPremium && onPurchase && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchaseClick(template);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        <ShoppingCart size={14} />
                        <span>{t.purchase} ({template.credit_price} {t.credits})</span>
                      </button>
                    )}
                  </div>
                )}

                {canAccess && !isSelected && (
                  <button
                    onClick={() => onSelect(template.template_id)}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    {t.selectTemplate}
                  </button>
                )}
              </div>

              {/* Premium badge */}
              {template.is_purchased && (
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Sparkles size={12} className="mr-1" />
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
