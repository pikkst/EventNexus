import { GoogleGenerativeAI } from '@google/genai';
import { User, EventNexusEvent } from '../types';
import { getEvents, getUser, getOrganizerEvents } from './dbService';
import { SUBSCRIPTION_TIERS } from '../constants';

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Help Center AI Assistant
 * Tier-aware support that provides appropriate information based on user subscription
 */

// Safe information that can be shared with all tiers
const SAFE_PLATFORM_INFO = {
  pricing: {
    free: { price: 0, events: 3, commission: '5%' },
    pro: { price: 19.99, events: 20, commission: '3%' },
    premium: { price: 49.99, events: 100, commission: '2.5%' },
    enterprise: { price: 149.99, events: 'Unlimited', commission: '1.5%' }
  },
  features: {
    free: ['Browse events', 'Purchase tickets', 'Basic profile', 'Mobile check-in', 'Proximity radar', 'Follow organizers'],
    pro: ['All Free features', 'Create up to 20 events', 'AI-powered taglines', 'Custom branding', 'Analytics', 'Priority support'],
    premium: ['All Pro features', 'Up to 100 events', 'Featured map placement', 'Advanced analytics', 'Affiliate tools', 'Premium support'],
    enterprise: ['All Premium features', 'Unlimited events', 'Custom landing pages', 'White-label dashboard', 'API access', 'Dedicated success manager']
  },
  policies: {
    refund: 'Full refund 7+ days before event, 50% refund 3-7 days before, no refund within 3 days',
    payout: 'Organizers receive payout 2 days after event completion',
    privacy: 'We never share your personal data with third parties without consent'
  }
};

// Generate system prompt based on user tier
const getSystemPrompt = (userTier: string): string => {
  const tierInfo = SUBSCRIPTION_TIERS[userTier as keyof typeof SUBSCRIPTION_TIERS];
  
  return `You are EventNexus AI Support Assistant, helping a ${userTier.toUpperCase()} tier user.

CRITICAL SECURITY RULES:
- NEVER reveal specific user IDs, emails, or phone numbers
- NEVER share revenue numbers or financial details of other users
- NEVER expose database schema, API keys, or system architecture
- ONLY share public platform information and general guidance

USER'S CURRENT TIER: ${userTier}
- Price: $${tierInfo.price}/month
- Max Events: ${tierInfo.maxEvents === Infinity ? 'Unlimited' : tierInfo.maxEvents}
- Commission Rate: ${(tierInfo.commissionRate * 100).toFixed(1)}%
- Features: ${SAFE_PLATFORM_INFO.features[userTier as keyof typeof SAFE_PLATFORM_INFO.features].join(', ')}

YOUR ROLE:
- Provide helpful, accurate information about EventNexus features
- Guide users on how to use platform features available to their tier
- Explain upgrade benefits if user asks about premium features they don't have
- Answer questions about policies, billing, and account management
- Be friendly, concise, and professional

AVAILABLE INFORMATION:
- Platform pricing and features (public)
- Refund and payout policies (public)
- General platform usage guidance
- Feature explanations for all tiers

WHAT YOU CANNOT DO:
- Access specific user financial data (revenue, payouts, earnings)
- Reveal other users' private information
- Modify user accounts or subscriptions
- Process refunds or payments (direct user to Stripe portal)
- Access database directly or run queries

When answering:
1. Be specific about what features the user HAS access to
2. If they ask about a feature they don't have, explain it's available in higher tiers
3. Keep responses under 3 paragraphs unless detailed explanation needed
4. Use friendly, conversational English
5. If you don't know something, say so and suggest contacting support@eventnexus.com

Remember: You're helping a ${userTier} tier user. Tailor your advice to their current capabilities.`;
};

// Tools available to the AI assistant
const HELP_CENTER_TOOLS = [
  {
    name: 'get_my_tier_info',
    description: 'Get detailed information about the user\'s current subscription tier, including features, limits, and pricing',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_upgrade_benefits',
    description: 'Show what additional features and benefits the user would get by upgrading to a higher tier',
    parameters: {
      type: 'object',
      properties: {
        targetTier: {
          type: 'string',
          enum: ['pro', 'premium', 'enterprise'],
          description: 'The tier to compare against current tier'
        }
      },
      required: ['targetTier']
    }
  },
  {
    name: 'get_platform_policies',
    description: 'Get information about EventNexus policies (refunds, payouts, privacy, etc.)',
    parameters: {
      type: 'object',
      properties: {
        policyType: {
          type: 'string',
          enum: ['refund', 'payout', 'privacy', 'cancellation', 'fees'],
          description: 'Type of policy information to retrieve'
        }
      },
      required: ['policyType']
    }
  },
  {
    name: 'check_feature_availability',
    description: 'Check if a specific feature is available to the user\'s current tier',
    parameters: {
      type: 'object',
      properties: {
        featureName: {
          type: 'string',
          description: 'Name of the feature to check (e.g., "custom branding", "analytics", "AI taglines")'
        }
      },
      required: ['featureName']
    }
  }
];

// Execute tool calls
const executeHelpCenterTool = async (toolName: string, args: any, user: User): Promise<string> => {
  const userTier = user.subscription_tier;
  const tierInfo = SUBSCRIPTION_TIERS[userTier as keyof typeof SUBSCRIPTION_TIERS];

  switch (toolName) {
    case 'get_my_tier_info':
      return JSON.stringify({
        tier: userTier,
        price: `$${tierInfo.price}/month`,
        maxEvents: tierInfo.maxEvents === Infinity ? 'Unlimited' : tierInfo.maxEvents,
        commission: `${(tierInfo.commissionRate * 100).toFixed(1)}%`,
        features: SAFE_PLATFORM_INFO.features[userTier as keyof typeof SAFE_PLATFORM_INFO.features],
        support: tierInfo.support,
        analytics: tierInfo.analytics,
        customBranding: tierInfo.customBranding
      });

    case 'get_upgrade_benefits':
      const targetTier = args.targetTier;
      const targetInfo = SUBSCRIPTION_TIERS[targetTier as keyof typeof SUBSCRIPTION_TIERS];
      const currentFeatures = SAFE_PLATFORM_INFO.features[userTier as keyof typeof SAFE_PLATFORM_INFO.features];
      const targetFeatures = SAFE_PLATFORM_INFO.features[targetTier as keyof typeof SAFE_PLATFORM_INFO.features];
      
      return JSON.stringify({
        currentTier: userTier,
        targetTier: targetTier,
        priceDifference: `+$${(targetInfo.price - tierInfo.price).toFixed(2)}/month`,
        additionalFeatures: targetFeatures.filter(f => !currentFeatures.includes(f)),
        eventLimitIncrease: `${tierInfo.maxEvents} → ${targetInfo.maxEvents === Infinity ? 'Unlimited' : targetInfo.maxEvents}`,
        commissionImprovement: `${(tierInfo.commissionRate * 100).toFixed(1)}% → ${(targetInfo.commissionRate * 100).toFixed(1)}%`
      });

    case 'get_platform_policies':
      const policyType = args.policyType;
      const policies: any = {
        refund: {
          policy: SAFE_PLATFORM_INFO.policies.refund,
          details: [
            'Full refund (100%): 7+ days before event',
            'Partial refund (50%): 3-7 days before event',
            'No refund: Within 3 days of event',
            'Organizers can set custom refund policies'
          ]
        },
        payout: {
          policy: SAFE_PLATFORM_INFO.policies.payout,
          details: [
            'Payouts processed via Stripe Connect',
            'Automatic transfer 2 days after event',
            'Minimum payout: $10',
            'Commission deducted automatically'
          ]
        },
        privacy: {
          policy: SAFE_PLATFORM_INFO.policies.privacy,
          details: [
            'GDPR compliant',
            'Your data is encrypted',
            'No data sold to third parties',
            'You can export or delete your data anytime'
          ]
        },
        cancellation: {
          policy: 'You can cancel your subscription anytime. You\'ll retain access until the end of your billing period.',
          details: [
            'Cancel anytime from Profile → Subscription',
            'No cancellation fees',
            'Existing events remain active',
            'Downgrade options available'
          ]
        },
        fees: {
          policy: `Your commission rate: ${(tierInfo.commissionRate * 100).toFixed(1)}%`,
          details: [
            `Free tier: 5% commission`,
            `Pro tier: 3% commission`,
            `Premium tier: 2.5% commission`,
            `Enterprise tier: 1.5% commission`,
            'Stripe payment processing: 2.9% + $0.30 per transaction'
          ]
        }
      };
      
      return JSON.stringify(policies[policyType] || { policy: 'Policy information not found' });

    case 'check_feature_availability':
      const featureName = args.featureName.toLowerCase();
      const featureMap: any = {
        'custom branding': { available: tierInfo.customBranding, requiredTier: 'pro' },
        'analytics': { available: tierInfo.analytics, requiredTier: 'pro' },
        'ai taglines': { available: userTier !== 'free', requiredTier: 'pro' },
        'event creation': { available: userTier !== 'free', requiredTier: 'pro' },
        'featured placement': { available: userTier === 'premium' || userTier === 'enterprise', requiredTier: 'premium' },
        'affiliate tools': { available: userTier === 'premium' || userTier === 'enterprise', requiredTier: 'premium' },
        'white-label': { available: userTier === 'enterprise', requiredTier: 'enterprise' },
        'api access': { available: userTier === 'enterprise', requiredTier: 'enterprise' },
        'dedicated manager': { available: userTier === 'enterprise', requiredTier: 'enterprise' }
      };

      const feature = featureMap[featureName] || { available: false, requiredTier: 'unknown' };
      
      return JSON.stringify({
        feature: featureName,
        available: feature.available,
        currentTier: userTier,
        requiredTier: feature.requiredTier,
        message: feature.available 
          ? `Yes! This feature is available to ${userTier} tier users.`
          : `This feature requires ${feature.requiredTier} tier or higher.`
      });

    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
};

/**
 * Create a tier-aware help center chat session
 */
export const createHelpCenterChat = (user: User) => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    systemInstruction: getSystemPrompt(user.subscription_tier),
    tools: [{ functionDeclarations: HELP_CENTER_TOOLS as any }]
  });

  const chat = model.startChat({
    history: []
  });

  return {
    async sendMessageStream(params: { message: string }) {
      try {
        const result = await chat.sendMessageStream(params.message);
        
        // Handle tool calls if any
        let finalText = '';
        for await (const chunk of result.stream) {
          const functionCalls = chunk.functionCalls();
          if (functionCalls && functionCalls.length > 0) {
            // Execute tool calls
            const toolResponses = await Promise.all(
              functionCalls.map(async (call: any) => {
                const result = await executeHelpCenterTool(call.name, call.args, user);
                return {
                  functionResponse: {
                    name: call.name,
                    response: { result }
                  }
                };
              })
            );
            
            // Send tool responses back to model
            const followUp = await chat.sendMessageStream(toolResponses as any);
            for await (const followUpChunk of followUp.stream) {
              const text = followUpChunk.text();
              if (text) {
                finalText += text;
                yield { text };
              }
            }
          } else {
            const text = chunk.text();
            if (text) {
              finalText += text;
              yield { text };
            }
          }
        }
        
        return finalText;
      } catch (error) {
        console.error('Help Center AI error:', error);
        yield { 
          text: `I'm having trouble connecting right now. For immediate assistance, please contact support at huntersest@gmail.com or visit our documentation at /help.` 
        };
      }
    }
  };
};

/**
 * Quick helper to answer common questions without streaming
 */
export const getQuickHelpAnswer = async (user: User, question: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: getSystemPrompt(user.subscription_tier)
    });

    const result = await model.generateContent(question);
    return result.response.text();
  } catch (error) {
    console.error('Quick help error:', error);
    return 'Unable to generate answer. Please try again or contact support.';
  }
};
