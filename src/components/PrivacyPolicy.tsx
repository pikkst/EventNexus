
import React from 'react';
import LegalPage from './LegalPage';

const PrivacyPolicy: React.FC = () => {
  const sections = [
    {
      title: '1. Introduction',
      content: 'At EventNexus, we prioritize your data security. This Privacy Policy explains how we collect, use, and protect your personal information. We are committed to transparency and GDPR compliance for all our users, especially those in the European Union.'
    },
    {
      title: '2. Data Collection',
      content: 'We collect minimal data to provide personalized event recommendations via our AI engine. Information collected includes: email address (required for account creation and event updates), name and profile information (optional), location data via GPS for map-based discovery (with your permission), usage statistics and device information (automatically collected), and payment information processed securely through Stripe (we do not store your credit card information).'
    },
    {
      title: '3. How We Use Data',
      content: 'Your data is used to: provide the map-first discovery service and personalized event recommendations powered by our AI engine (Google Gemini), process ticket transactions securely via Stripe, send event updates and notifications about events you\'re interested in, improve platform performance through analytics and AI-driven insights, and ensure security and prevent fraud.'
    },
    {
      title: '4. Data Sharing',
      content: 'We share your contact information with event organizers only for events you have purchased tickets for. We do not sell your personal data to third parties for marketing purposes. We use trusted service providers: Google Cloud Infrastructure (hosting and AI services), Stripe (payment processing), and Supabase (secure database with PostgreSQL). All service providers are contractually bound to protect your data and comply with GDPR standards.'
    },
    {
      title: '5. Infrastructure & Security',
      content: 'EventNexus uses Google Cloud Infrastructure to host our services, ensuring enterprise-level security and reliability. All data is encrypted in transit and at rest. We implement robust security protocols including Row Level Security (RLS) policies in our database, PCI DSS Level 1 compliant payment processing through Stripe, and regular security audits and monitoring. We are fully GDPR compliant to protect our EU users.'
    },
    {
      title: '6. Your Rights (GDPR)',
      content: 'Under GDPR, you have the right to: access your personal data, correct inaccurate data, request deletion of your data (right to be forgotten), object to data processing, request data portability, and withdraw consent at any time. To exercise these rights, contact us at support@eventnexus.eu with response time within 24 hours.'
    },
    {
      title: '7. Data Retention',
      content: 'We retain your personal data only as long as necessary to provide our services and comply with legal obligations. Account data is kept while your account is active. Transaction records are retained for 7 years for tax and legal compliance. Marketing communications data is kept until you unsubscribe.'
    },
    {
      title: '8. Cookies & Tracking',
      content: 'We use essential cookies for authentication and session management. Analytics cookies help us understand how you use our platform (you can opt-out). We do not use third-party advertising cookies. You can manage cookie preferences in your browser settings.'
    },
    {
      title: '9. International Data Transfers',
      content: 'Your data may be processed in countries outside the EU, including the United States (Google Cloud, Stripe). We ensure adequate protection through: Standard Contractual Clauses (SCCs) approved by the European Commission, and service providers certified under EU-US Data Privacy Framework where applicable.'
    },
    {
      title: '10. Children\'s Privacy',
      content: 'EventNexus is not intended for users under 16 years of age. We do not knowingly collect data from children. If you believe we have collected data from a child, contact us immediately.'
    },
    {
      title: '11. Changes to This Policy',
      content: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or prominent notice on our platform. Continued use after changes constitutes acceptance.'
    },
    {
      title: '12. Contact Us',
      content: 'For privacy-related questions or to exercise your rights, contact us at: Email: support@eventnexus.eu, Response time: Within 24 hours, Address: Põltsamaa, Estonia, Legal Entity: EventNexus OÜ'
    }
  ];

  return <LegalPage title="Privacy Policy" lastUpdated="January 20, 2026" sections={sections} />;
};

export default PrivacyPolicy;
