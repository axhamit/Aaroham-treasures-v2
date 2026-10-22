'use client';
import CourierHeader from '@/components/CourierHeader';

export default function CourierLayout({ children }) {
  return (
    <>
      <CourierHeader />
      <main>{children}</main>
    </>
  );
}
