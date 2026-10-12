import React, { Fragment, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Page from "../../components/Page";
import { IconCheck, IconChevronDown, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { iconStroke } from "../../config/config";
import { PAYMENT_ICONS } from "../../config/payment_icons";
import { addNewPaymentType, deletePaymentType, togglePaymentType, updatePaymentType, usePaymentTypes } from "../../controllers/settings.controller";
import toast from "react-hot-toast";
import { mutate } from "swr";
import { useTheme } from "../../contexts/ThemeContext";
import { Listbox, Transition } from '@headlessui/react'

export default function PaymentTypesPage() {
  const { t } = useTranslation();
  const paymentTypeAddRef = useRef();

  const paymentTypeIdUpdateRef = useRef();
  const paymentTypeTitleUpdateRef = useRef();
  const paymentTypeIsActiveUpdateRef = useRef();

  const [selectedIcon, setSelectedIcon] = useState();
  const { theme } = useTheme();


  const { APIURL, data: paymentTypes, error, isLoading } = usePaymentTypes();

  if (isLoading) {
    return <Page className="px-8 py-6">{t('payment_types.please_wait')}</Page>;
  }

  if (error) {
    console.error(error);
    return <Page className="px-8 py-6">{t('payment_types.error_loading_data')}</Page>;
  }

  const btnDelete = async (id) => {
    const isConfirm = window.confirm(t('payment_types.delete_confirm'));

    if(!isConfirm) {
      return;
    }

    try {
      toast.loading(t('payment_types.please_wait'));
      const res = await deletePaymentType(id);

      if(res.status == 200) {
        await mutate(APIURL);
        toast.dismiss();
        toast.success(res.data.message);
      }
    } catch (error) {
      const message = error?.response?.data?.message || t('payment_types.something_went_wrong');
      console.error(error);

      toast.dismiss();
      toast.error(message);
    }
  };

  const btnShowUpdate = async (id, title, isActive, icon) => {
    paymentTypeIdUpdateRef.current.value = id;
    paymentTypeIsActiveUpdateRef.current.checked = isActive;
    paymentTypeTitleUpdateRef.current.value = title;
    setSelectedIcon(icon);
    setTimeout(()=>{document.getElementById('modal-update').showModal();}, 100);
  };

  const btnUpdate = async () => {
    const id = paymentTypeIdUpdateRef.current.value
    const title = paymentTypeTitleUpdateRef.current.value
    const isActive = paymentTypeIsActiveUpdateRef.current.checked

    if(!title) {
      toast.error(t('payment_types.payment_type_title'));
      return;
    }

    try {
      toast.loading(t('payment_types.please_wait'));
      const res = await updatePaymentType(id, title, isActive, selectedIcon);

      if(res.status == 200) {
        paymentTypeIdUpdateRef.current.value = null;
        paymentTypeIsActiveUpdateRef.current.checked = null;
        paymentTypeTitleUpdateRef.current.value = null;

        await mutate(APIURL);
        setSelectedIcon(undefined);
        toast.dismiss();
        toast.success(res.data.message);
      }
    } catch (error) {
      const message = error?.response?.data?.message || t('payment_types.something_went_wrong');
      console.error(error);

      toast.dismiss();
      toast.error(message);
    }
  };

  const toggle = async (id, value) => {
    try {
      toast.loading(t('payment_types.please_wait'));
      const res = await togglePaymentType(id, value);

      if(res.status == 200) {
        await mutate(APIURL);
        toast.dismiss();
        toast.success(res.data.message);
      }
    } catch (error) {
      const message = error?.response?.data?.message || t('payment_types.something_went_wrong');
      console.error(error);

      toast.dismiss();
      toast.error(message);
    }
  };

  async function btnAdd() {
    const paymentType = paymentTypeAddRef.current.value;

    if(!paymentType) {
      toast.error(t('payment_types.payment_type_title'));
      return;
    }

    try {
      toast.loading(t('payment_types.please_wait'));
      const res = await addNewPaymentType(paymentType, true, selectedIcon);

      if(res.status == 200) {
        paymentTypeAddRef.current.value = "";
        await mutate(APIURL);
        setSelectedIcon(undefined);
        toast.dismiss();
        toast.success(res.data.message);
      }
    } catch (error) {
      const message = error?.response?.data?.message || t('payment_types.something_went_wrong');
      console.error(error);

      toast.dismiss();
      toast.error(message);
    }
  };

  return (
    <Page className="px-8 py-6">
      <div className="flex items-center gap-6">
        <h3 className="text-3xl font-light">{t('payment_types.title')}</h3>
        <button
          onClick={() => document.getElementById("modal-add").showModal()}
          className = "text-sm rounded-lg border transition active:scale-95 hover:shadow-lg px-2 py-1 flex items-center gap-1 text-apax-text bg-apax-gray border-apax-border-green hover:bg-apax-button-hover"
        >
          <IconPlus size={22} stroke={iconStroke} /> {t('payment_types.new')}
        </button>
      </div>

      <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentTypes.map((paymentType, index) => {
          const { id, title, is_active, icon } = paymentType;

          return (
            <div key={index} className='flex flex-col justify-between transition active:scale-95 gap-4 px-4 py-3 border rounded-2xl text-apax-text border-apax-border-green'>
              <div className="flex items-center gap-2">
                {icon && <div className='w-12 h-12 rounded-full flex items-center justify-center bg-apax-bg-gray'>{PAYMENT_ICONS[icon]}</div>} <p>{title}</p>
              </div>
              <div className="mt-4 flex gap-2 items-center">
                <div className="flex flex-1 items-center gap-2">
                  <button
                    onClick={() => {
                      btnShowUpdate(id, title, is_active, icon);
                    }}
                    className='w-8 h-8 rounded-full flex items-center justify-center text-apax-text hover:bg-apax-button-hover'
                  >
                    <IconPencil stroke={iconStroke} />
                  </button>
                  <button
                    onClick={() => {
                      btnDelete(id);
                    }}
                    className='w-8 h-8 rounded-full flex items-center justify-center text-apax-red transition active:scale-95 hover:bg-apax-button-hover'
                  >
                    <IconTrash stroke={iconStroke} />
                  </button>
                </div>

                {/* switch */}
                <label className="relative flex cursor-pointer no-drag">
                  <input
                    onChange={(e) => toggle(id, e.target.checked)}
                    defaultChecked={is_active}
                    checked={is_active}
                    type="checkbox"
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full  after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-apax-bg-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all bg-apax-checkbox peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-apax-gray peer-checked:bg-apax-green peer-checked:after:border-apax-border-green`}></div>
                </label>
                {/* switch */}
              </div>
            </div>
          );
        })}
      </div>

      <dialog id="modal-add" className="modal modal-bottom sm:modal-middle">
        <div className='modal-box overflow-y-visible border border-apax-border-green dark:rounded-2xl'>
          <h3 className="font-bold text-lg">{t('payment_types.add_new_payment_type')}</h3>

          <div className="my-4">
            <label
              htmlFor="paymentType"
              className="mb-1 block text-gray-500 text-sm"
            >
              {t('payment_types.payment_type_title')}
            </label>
            <input
              ref={paymentTypeAddRef}
              type="text"
              name="paymentType"
              className='text-sm w-full rounded-lg px-4 py-2 border border-apax-border-green dark:bg-black focus:outline-apax-border-green'
              placeholder={t('payment_types.enter_payment_type')}
            />

            <label
              htmlFor="icon"
              className="mb-1 mt-4 block text-gray-500 text-sm"
            >
              {t('payment_types.icon')}
            </label>
            <Listbox value={selectedIcon} onChange={setSelectedIcon}>
              <div className="relative mt-1">
                <Listbox.Button 
                className='relative w-full cursor-default text-left sm:text-sm border border-apax-border-green dark:bg-black rounded-lg px-4 py-2 focus:border-apax-border-green focus:outline-none'>

                  <span className="truncate flex items-center gap-2">
                    {PAYMENT_ICONS[selectedIcon]}{" "}
                    {selectedIcon
                      ? new String(selectedIcon).toUpperCase()
                      : t('payment_types.select_icon')}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <IconChevronDown
                      className="text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className='absolute mt-1 max-h-60 w-full overflow-auto rounded-md py-1 text-base shadow-lg focus:outline-none sm:text-sm grid grid-cols-3 gap-4 z-50 border border-apax-gray bg-background'>
                    {Object.entries(PAYMENT_ICONS).map((icon) => (
                      <Listbox.Option
                        key={icon[0]}
                        className={({ active }) =>
                          `relative cursor-default select-none w-full h-full flex items-center justify-center py-4 rounded-lg hover:bg-apax-gray hover:text-foreground  ${
                            active
                              ? (theme === 'black' ? 'bg-apax-bg-hover-dark-mode/70 text-white' : 'bg-apax-green/50 text-apax-green')
                              : (theme === 'black' ? 'text-white' : '')
                          }`
                        }
                        value={icon[0]}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected
                                  ? "font-medium text-apax-green"
                                  : "font-normal"
                              }`}
                            >
                              {icon[1]}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-apax-green">
                                <IconCheck
                                  stroke={iconStroke}
                                  aria-hidden="true"
                                />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>

          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className='rounded-xl transition active:scale-95 border hover:shadow-lg px-4 py-3 text-gray-500 border-apax-border-green bg-apax-card-bg hover:bg-apax-button-hover text-apax-text'>
                {t('payment_types.close')}
              </button>
              <button
                onClick={() => {
                  btnAdd();
                }}
                className=' rounded-xl transition active:scale-95 hover:shadow-lg px-4 py-3 text-white ml-3  border border-apax-border-green bg-apax-green hover:bg-apax-green-button-hover'
              >
                {t('payment_types.save')}
              </button>
            </form>
          </div>
        </div>
      </dialog>

      <dialog id="modal-update" className="modal modal-bottom sm:modal-middle">
        <div className='modal-box overflow-y-visible border border-apax-border-green dark:rounded-2xl'>
          <h3 className="font-bold text-lg">{t('payment_types.update_payment_type')}</h3>

          <div className="mt-4">
            <input type="hidden" ref={paymentTypeIdUpdateRef} />
            <label
              htmlFor="paymentTypeUpdate"
              className="mb-1 block text-gray-500 text-sm"
            >
              {t('payment_types.payment_type_title')}
            </label>
            <input
              ref={paymentTypeTitleUpdateRef}
              type="text"
              name="paymentTypeUpdate"
              className='text-sm w-full rounded-lg px-4 py-2 border border-apax-border-green dark:bg-black focus:outline-apax-border-green'
              placeholder={t('payment_types.enter_payment_type')}
            />
          </div>

          <div className="mt-4 flex items-center justify-between w-full">
            <label
              htmlFor="isActivePaymentUpdate"
              className="block text-gray-500 text-sm"
            >
              {t('payment_types.active')}
            </label>
            {/* switch */}
            <label className="relative flex items-center cursor-pointer no-drag">
              <input
                ref={paymentTypeIsActiveUpdateRef}
                type="checkbox"
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full  after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-100 after:border-apax-bg-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all bg-apax-checkbox peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-apax-ring-light peer-checked:bg-apax-green peer-checked:after:border-apax-border-green`}></div>
            </label>
            {/* switch */}
          </div>

          <div className="mt-4">
            <label
              htmlFor="icon"
              className="mb-1 mt-4 block text-gray-500 text-sm"
            >
              {t('payment_types.icon')}
            </label>
            <Listbox value={selectedIcon} onChange={setSelectedIcon}>
              <div className="relative mt-1">
                <Listbox.Button className='relative w-full cursor-default text-left sm:text-sm border border-apax-border-green dark:bg-black rounded-lg px-4 py-2 focus:border-apax-border-green focus:outline-none'>
                  <span className="truncate flex items-center gap-2">
                    {PAYMENT_ICONS[selectedIcon]}{" "}
                    {selectedIcon
                      ? new String(selectedIcon).toUpperCase()
                      : t('payment_types.select_icon')}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <IconChevronDown
                      className="text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                   <Listbox.Options className='absolute mt-1 max-h-60 w-full overflow-auto rounded-md py-1 text-base shadow-lg focus:outline-none sm:text-sm grid grid-cols-3 gap-4 z-50 border border-apax-gray bg-background'>
                    {Object.entries(PAYMENT_ICONS).map((icon) => (
                      <Listbox.Option
                        key={icon[0]}
                        className={({ active }) =>
                          `relative cursor-default select-none w-full h-full flex items-center justify-center py-4 rounded-lg hover:bg-apax-gray hover:text-foreground  ${
                            active
                              ? (theme === 'black' ? 'bg-apax-bg-hover-dark-mode/70 text-white' : 'bg-apax-green/50 text-apax-green')
                              : (theme === 'black' ? 'text-white' : '')
                          }`
                        }
                        value={icon[0]}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected
                                  ? "font-medium text-apax-green"
                                  : "font-normal"
                              }`}
                            >
                              {icon[1]}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-apax-green">
                                <IconCheck
                                  stroke={iconStroke}
                                  aria-hidden="true"
                                />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>

          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className='btn transition active:scale-95 hover:shadow-lg px-4 py-3 flex-1 items-center justify-center align-center rounded-xl border border-apax-border-green bg-apax-card-bg hover:bg-apax-button-hover text-apax-text'>
                {t('payment_types.close')}
              </button>
              <button
                onClick={() => {
                  btnUpdate();
                }}
                className='rounded-xl transition active:scale-95 hover:shadow-lg px-4 py-3 text-white ml-3 border border-apax-border-green bg-apax-green hover:bg-apax-green-button-hover'
              >
                {t('payment_types.save')}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </Page>
  );
}
