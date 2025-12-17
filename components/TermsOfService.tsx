
import React from 'react';
import LegalPage from './LegalPage';

const TermsOfService: React.FC = () => {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using EventNexus, you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access the platform. We reserve the right to update these terms at any time.'
    },
    {
      title: '2. User Accounts',
      content: 'You must be at least 18 years old to create an account. You are responsible for maintaining the security of your account and password. EventNexus cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.'
    },
    {
      title: '3. Ticket Purchases and Refunds',
      content: 'All ticket purchases are final, subject to the refund policy set by the event organizer. EventNexus acts as an intermediary; we are not responsible for event cancellations, though we facilitate refunds when authorized by the organizer.'
    },
    {
      title: '4. Content and Conduct',
      content: 'You may not use the platform for any illegal or unauthorized purpose. You are solely responsible for the content you upload, including event descriptions, images, and reviews. We reserve the right to remove any content that violates our community standards.'
    }
  ];

  return <LegalPage title="Terms of Service" lastUpdated="November 10, 2024" sections={sections} />;
};

export default TermsOfService;
