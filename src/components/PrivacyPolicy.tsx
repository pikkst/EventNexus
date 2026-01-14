
import React from 'react';
import LegalPage from './LegalPage';

const PrivacyPolicy: React.FC = () => {
  const sections = [
    {
      title: '1. Data Collection',
      content: 'We collect information you provide directly to us (name, email, profile data) and information collected automatically (location data via GPS for mapping, usage statistics, and device info).'
    },
    {
      title: '2. How We Use Data',
      content: 'Your data is used to provide the map-first discovery service, process ticket transactions, send event updates, and improve platform performance through AI-driven insights.'
    },
    {
      title: '3. Data Sharing',
      content: 'We share your contact information with event organizers for events you have purchased tickets for. We do not sell your personal data to third parties for marketing purposes.'
    },
    {
      title: '4. Security',
      content: 'We implement robust encryption and security protocols (GDPR compliant) to protect your sensitive information and payment data.'
    }
  ];

  return <LegalPage title="Privacy Policy" lastUpdated="November 10, 2024" sections={sections} />;
};

export default PrivacyPolicy;
