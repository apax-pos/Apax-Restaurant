import React from 'react'
import Page from "../components/Page";
import LanguageChanger from "../components/LanguageChanger";
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

export default function LanguagePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Page>
      <h3 className="text-center mt-4">{t('appbar.change_language')}</h3>

      <div className="flex flex-col gap-4 w-full items-center justify-center mt-8">
        <div className={`w-full md:w-96 rounded-3xl border ${theme === 'black' ? 'border-apax-border-dark-mode' : 'border-apax-green-light'}`}>
          <div className="px-4 py-3">
            <label className="block mb-2">{t('appbar.select_language')}</label>
            <LanguageChanger className='rounded-full px-2 py-2 transition active:scale-95 w-full border border-apax-green-light bg-apax-gray hover:bg-apax-button-hover outline-border-apax-gray' />
          </div>
        </div>
      </div>
    </Page>
  );
}