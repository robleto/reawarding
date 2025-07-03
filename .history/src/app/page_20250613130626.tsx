import React from 'react';
import HeaderNav from '../components/HeaderNav';
import YearSection from '../components/YearSection';
import oscarData from '../data/Oscars.json';

export default function Page() {
  return (
    <div className="main-container max-w-screen-xl w-full mx-auto px-8 overflow-x-hidden">
      <HeaderNav />
      <div className="w-[25px] h-[12.5px] bg-[url(https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-06-13/BKANmvjOQ8.png)] bg-cover bg-no-repeat mt-3 ml-auto mr-[calc(1440px-896.5px)]" />
      <div className="h-px bg-[url(https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-06-13/3NaiMFWqci.png)] bg-cover bg-no-repeat my-4" />
      <div className="relative">
        <div className="flex flex-col">
          {oscarData.years.map((yearData) => (
            <YearSection
              key={yearData.year}
              year={yearData.year}
              movies={yearData.nominees}
              winner={yearData.winner}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
