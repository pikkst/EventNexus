
import React from 'react';
import LegalPage from './LegalPage';
import { useTranslation } from '../i18n/useTranslation';

const TermsOfService: React.FC = () => {
  const { t } = useTranslation();
  
  const sections = [
    {
      title: t.terms.section1Title,
      content: t.terms.section1Content
    },
    {
      title: t.terms.section2Title,
      content: t.terms.section2Content
    },
    {
      title: t.terms.section3Title,
      content: t.terms.section3Content
    },
    {
      title: t.terms.section4Title,
      content: t.terms.section4Content
    }
  ];

  return <LegalPage title={t.terms.title} lastUpdated={t.terms.lastUpdated} sections={sections} />;
};

export default TermsOfService;
