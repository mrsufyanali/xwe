// ==UserScript==
// @name        Spain Visa Slot Selection Bot - Last Date/Slot
// @namespace   SpainVisaBot
// @version     1.1
// @description Automates slot selection for Spain visa appointments (selects last date and last slot)
// @match       https://appointment.thespainvisa.com/Global/Appointment/SlotSelection*
// @grant       none
// @author      SUFYAN
// ==/UserScript==

(function() {
    'use strict';

    class SlotSelectionBot {
        constructor() {
            this.autoSubmitForms = { slotSelection: "true" };
            this.start();
        }

        start() {
            console.log(`${this.constructor.name} started - Selecting last date and last slot`);

            this.#hidePreloader();
            this.#makeLoaderDismissable();
            this.#removeRandomnessFromUi();
            window.OnAppointmentdateChange = () => this.#getAvailableSlotTimes();
            if (document.readyState === 'complete') {
                this.#selectLastDate();
            } else {
                window.addEventListener('load', () => this.#selectLastDate());
            }
        }

        #hidePreloader() {
            $('.preloader').hide();
        }

        #makeLoaderDismissable() {
            $('<button class="btn btn-secondary position-absolute top-50 start-50 translate-middle-x mt-5" onclick="window.HideLoader();">Hide Loader</button>')
                .appendTo('.global-overlay-loader');
        }

        #removeRandomnessFromUi() {
            $('#div-main > :is(:first-child, :last-child)').removeClass().hide();
            $('#div-main > :has(form)').addClass('mx-auto');

            $('form > div:nth-child(2)')
                .addClass('gap-4')
                .children('div')
                .removeClass((_, className) => className.match(/m[tb]-\d/g));

            $('div:has(> #btnSubmit)').addClass('mt-5');
        }

        #selectLastDate() {
            const checkDatePicker = setInterval(() => {
                const datePicker = $('.k-datepicker:visible .k-input').data('kendoDatePicker');
                if (datePicker && window.availDates) {
                    clearInterval(checkDatePicker);

                    const allowedDates = window.availDates.ad
                        .filter(it => it.AppointmentDateType === 0)
                        .sort((a, b) => new Date(a.DateText) - new Date(b.DateText));

                    if (allowedDates.length > 0) {
                        const lastDate = allowedDates[allowedDates.length - 1];
                        console.log('Selecting last available date:', lastDate.DateText);
                        datePicker.value(lastDate.DateText);
                        datePicker.trigger('change');
                    }
                }
            }, 0);
        }

        #getAvailableSlotTimes() {
            const apptDate = $('.k-datepicker:visible .k-input').val();
            const slotDropDown = $('.k-dropdown:visible > .form-control').data('kendoDropDownList');

            if (!apptDate) {
                slotDropDown.value(undefined);
                slotDropDown.setDataSource([]);
                return false;
            }

            window.ShowLoader();
            const that = this;

            $.ajax({
                type: 'POST',
                url: `/Global/appointment/GetAvailableSlotsByDate?data=${encodeURIComponent(new URLSearchParams(location.search).get('data'))}&appointmentDate=${apptDate}`,
                dataType: 'json',
                success: function(data) {
                    if (data.success) {
                        that.#selectLastSlot(data.data);
                    } else {
                        window.ShowError(data.err);
                        if (data.ru && window.confirm(`You will be redirected to: ${data.ru}`)) {
                            window.location.replace(data.ru);
                        }
                    }
                },
                complete: function() {
                    window.HideLoader();
                },
                error: function(xhr, status, error) {
                    console.error("Error fetching slots:", error);
                    window.HideLoader();
                }
            });
        }

        #selectLastSlot(slots) {
            const availableSlots = slots.filter(s => s.Count > 0);
            if (availableSlots.length === 0) {
                console.log("No available slots found");
                return;
            }

            const sortedSlots = availableSlots.sort((a, b) => {
                const timeA = a.StartTime.toLowerCase();
                const timeB = b.StartTime.toLowerCase();
                return timeA.localeCompare(timeB);
            });

            const lastSlot = sortedSlots[sortedSlots.length - 1];
            console.log('Selecting last available slot:', lastSlot.StartTime);

            if (lastSlot) {
                try {
                    speechSynthesis.speak(new SpeechSynthesisUtterance('Last slot selected'));
                } catch (e) {
                    console.log("Speech synthesis not available");
                }

                const slotDropDown = $('.k-dropdown:visible > .form-control').data('kendoDropDownList');
                slotDropDown.setDataSource(slots);
                slotDropDown.value(lastSlot.Id);

                if (/on|true/i.test(this.autoSubmitForms?.slotSelection)) {
                    setTimeout(() => {
                        $('#btnSubmit').trigger('click');
                    }, 0);
                }
            }
        }
    }

    const checkJQuery = setInterval(() => {
        if (typeof window.jQuery !== 'undefined') {
            clearInterval(checkJQuery);
            new SlotSelectionBot();
        }
    }, 0);
})();