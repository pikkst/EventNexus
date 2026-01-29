
import React from 'react';
import LegalPage from './LegalPage';
import { useTranslation } from '../i18n/useTranslation';

const PrivacyPolicy: React.FC = () => {
  const t = useTranslation();
  
  const sections = [
    {
      title: t.privacy.section1Title,
      content: t.privacy.section1Content
    },
    {
      title: t.privacy.section2Title,
      content: t.privacy.section2Content
    },
    {
      title: t.privacy.section3Title,
      content: t.privacy.section3Content
    },
    {
      title: t.privacy.section4Title,
      content: t.privacy.section4Content
    },
    {
      title: t.privacy.section5Title,
      content: t.privacy.section5Content
    },
    {
      title: t.privacy.section6Title,
      content: t.privacy.section6Content
    },
    {
      title: t.privacy.section7Title,
      content: t.privacy.section7Content
    },
    {
      title: t.privacy.section8Title,
      content: t.privacy.section8Content
    },
    {
      title: t.privacy.section9Title,
      content: t.privacy.section9Content
    },
    {
      title: t.privacy.section10Title,
      content: t.privacy.section10Content
    },
    {
      title: t.privacy.section11Title,
      content: t.privacy.section11Content
    },
    {
      title: t.privacy.section12Title,
      content: t.privacy.section12Content
    }
  ];

  return <LegalPage title={t.privacy.title} lastUpdated={t.privacy.lastUpdated} sections={sections} />;
};

export default PrivacyPolicy;
