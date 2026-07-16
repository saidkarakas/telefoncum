import React from 'react';
import PhoneFilters from './PhoneFilters';
import PhoneList from './PhoneList';
import PhoneForm from './PhoneForm';
import { PhoneProvider } from '../context/PhoneContext';

export default function PhoneManager({ 
  globalSearchQuery, 
  setSelectedPhoneId, 
  setOpenPhoneDetail,
  activePage 
}) {
  return (
    <PhoneProvider 
      globalSearchQuery={globalSearchQuery} 
      activePage={activePage}
    >
      <div className="space-y-4">
        <PhoneFilters />
        <PhoneList 
          setSelectedPhoneId={setSelectedPhoneId} 
          setOpenPhoneDetail={setOpenPhoneDetail} 
        />
        <PhoneForm />
      </div>
    </PhoneProvider>
  );
}
