/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// import { GoogleGenAI } from '@google/genai'; // Kept for potential future use

// const API_KEY = process.env.API_KEY; // Ensure API_KEY is set in environment if using GenAI

// --- Interfaces para los datos ---
interface UserProfile {
  username: string | null;
}

interface MedicationReminder {
  id: string;
  name: string;
  time: string; // HH:MM
  dose?: string;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

interface BloodPressureNote {
  id: string;
  date: string; // YYYY-MM-DD
  systolic: number;
  diastolic: number;
  pulse?: number;
}

interface GeneralNoteAttachment {
  name: string;
  type: string;
  dataUrl: string; // Base64 data URL
}

interface GeneralNote {
  id: string;
  text: string;
  timestamp: number;
  attachment?: GeneralNoteAttachment;
}

// --- Constantes para LocalStorage ---
const LS_USER_PROFILE = 'healthAppUserProfile';
const LS_REMINDERS = 'healthAppReminders';
const LS_CONTACTS = 'healthAppContacts';
const LS_BP_NOTES = 'healthAppBpNotes';
const LS_GENERAL_NOTES = 'healthAppGeneralNotes';

// --- Estado de la aplicación (cargado desde LocalStorage) ---
let userProfile: UserProfile = { username: null };
let reminders: MedicationReminder[] = [];
let contacts: EmergencyContact[] = [];
let bpNotes: BloodPressureNote[] = [];
let generalNotes: GeneralNote[] = [];

// --- Elementos del DOM ---
let userGreetingEl: HTMLElement | null;
let usernameInputEl: HTMLInputElement | null;
let saveUsernameButtonEl: HTMLButtonElement | null;

let remindersListEl: HTMLElement | null;
let addReminderFormEl: HTMLFormElement | null;
let medicationNameInputEl: HTMLInputElement | null;
let medicationTimeInputEl: HTMLInputElement | null;
let medicationDoseInputEl: HTMLInputElement | null;

let contactsListEl: HTMLElement | null;
let addContactFormEl: HTMLFormElement | null;
let contactNameInputEl: HTMLInputElement | null;
let contactPhoneInputEl: HTMLInputElement | null;

let bpNotesListEl: HTMLElement | null;
let addBpNoteFormEl: HTMLFormElement | null;
let bpDateInputEl: HTMLInputElement | null;
let bpSystolicInputEl: HTMLInputElement | null;
let bpDiastolicInputEl: HTMLInputElement | null;
let bpPulseInputEl: HTMLInputElement | null;

let generalNotesListEl: HTMLElement | null;
let addGeneralNoteFormEl: HTMLFormElement | null;
let generalNoteTextInputEl: HTMLTextAreaElement | null;
let generalNoteAttachmentInputEl: HTMLInputElement | null;
let attachmentFilenameDisplayEl: HTMLElement | null;


let reminderSoundEl: HTMLAudioElement | null;
let reminderModalEl: HTMLElement | null;
let modalMedicationNameEl: HTMLElement | null;
let modalMedicationDoseEl: HTMLElement | null;
let modalMedicationDoseContainerEl: HTMLElement | null;
let modalUnderstoodButtonEl: HTMLButtonElement | null;
let modalDescriptionTextEl: HTMLElement | null;


let currentIntervalId: number | null = null;
let audioContext: AudioContext | null = null;


// --- Funciones de Utilidad para LocalStorage ---
function loadDataFromLocalStorage() {
  userProfile = JSON.parse(localStorage.getItem(LS_USER_PROFILE) || '{"username": null}');
  reminders = JSON.parse(localStorage.getItem(LS_REMINDERS) || '[]');
  contacts = JSON.parse(localStorage.getItem(LS_CONTACTS) || '[]');
  bpNotes = JSON.parse(localStorage.getItem(LS_BP_NOTES) || '[]');
  generalNotes = JSON.parse(localStorage.getItem(LS_GENERAL_NOTES) || '[]');
}

function saveDataToLocalStorage() {
  localStorage.setItem(LS_USER_PROFILE, JSON.stringify(userProfile));
  localStorage.setItem(LS_REMINDERS, JSON.stringify(reminders));
  localStorage.setItem(LS_CONTACTS, JSON.stringify(contacts));
  localStorage.setItem(LS_BP_NOTES, JSON.stringify(bpNotes));
  localStorage.setItem(LS_GENERAL_NOTES, JSON.stringify(generalNotes));
}

// --- Funciones de Renderizado ---
function renderUserProfile() {
  if (userGreetingEl) {
    userGreetingEl.textContent = userProfile.username ? `Hola, ${userProfile.username}!` : 'Bienvenido/a!';
  }
  if (usernameInputEl && userProfile.username) {
    usernameInputEl.value = userProfile.username;
  }
}

function renderReminders() {
  if (!remindersListEl) return;
  remindersListEl.innerHTML = '';
  if (reminders.length === 0) {
    remindersListEl.innerHTML = '<p>No hay recordatorios configurados.</p>';
    return;
  }
  reminders.forEach(reminder => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span><strong>${reminder.name}</strong> - ${reminder.time} ${reminder.dose ? `(${reminder.dose})` : ''}</span>
      <div class="actions">
        <button data-id="${reminder.id}" class="delete-reminder" aria-label="Eliminar recordatorio ${reminder.name}">Eliminar</button>
      </div>
    `;
    remindersListEl.appendChild(li);
  });
  document.querySelectorAll('.delete-reminder').forEach(button => {
    button.addEventListener('click', handleDeleteReminder);
  });
}

function renderContacts() {
  if (!contactsListEl) return;
  contactsListEl.innerHTML = '';
  if (contacts.length === 0) {
    contactsListEl.innerHTML = '<p>No hay contactos de emergencia guardados.</p>';
    return;
  }
  contacts.forEach(contact => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span><strong>${contact.name}</strong> - ${contact.phone}</span>
      <div class="actions">
        <button data-phone="${contact.phone}" class="call-button" aria-label="Llamar a ${contact.name}">Llamar</button>
        <button data-id="${contact.id}" class="delete-contact" aria-label="Eliminar contacto ${contact.name}">Eliminar</button>
      </div>
    `;
    contactsListEl.appendChild(li);
  });
  document.querySelectorAll('.delete-contact').forEach(button => {
    button.addEventListener('click', handleDeleteContact);
  });
  document.querySelectorAll('.call-button').forEach(button => {
    button.addEventListener('click', handleCallContact);
  });
}

function renderBpNotes() {
  if (!bpNotesListEl) return;
  bpNotesListEl.innerHTML = '';
   if (bpNotes.length === 0) {
    bpNotesListEl.innerHTML = '<p>No hay notas de presión arterial.</p>';
    return;
  }
  // Sort by date, most recent first
  const sortedNotes = [...bpNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  sortedNotes.forEach(note => {
    const li = document.createElement('li');
    const formattedDate = new Date(note.date + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    li.innerHTML = `
      <span><strong>Fecha:</strong> ${formattedDate}, <strong>Sistólica:</strong> ${note.systolic}, <strong>Diastólica:</strong> ${note.diastolic} ${note.pulse ? `, <strong>Pulso:</strong> ${note.pulse}` : ''}</span>
      <div class="actions">
        <button data-id="${note.id}" class="delete-bp-note" aria-label="Eliminar nota de presión del ${formattedDate}">Eliminar</button>
      </div>
    `;
    bpNotesListEl.appendChild(li);
  });
  document.querySelectorAll('.delete-bp-note').forEach(button => {
    button.addEventListener('click', handleDeleteBpNote);
  });
}

function renderGeneralNotes() {
  if (!generalNotesListEl) return;
  generalNotesListEl.innerHTML = '';
   if (generalNotes.length === 0) {
    generalNotesListEl.innerHTML = '<p>No hay notas médicas generales.</p>';
    return;
  }
  // Sort by timestamp, most recent first
  const sortedNotes = [...generalNotes].sort((a, b) => b.timestamp - a.timestamp);
  sortedNotes.forEach(note => {
    const li = document.createElement('li');
    const date = new Date(note.timestamp).toLocaleString('es-ES');

    let attachmentHtml = '';
    if (note.attachment) {
      attachmentHtml = `
        <div class="attachment-info">
          <span class="attachment-icon" aria-hidden="true">📎</span>
          <a href="${note.attachment.dataUrl}" download="${note.attachment.name}" target="_blank" rel="noopener noreferrer" aria-label="Descargar archivo adjunto ${note.attachment.name}">
            ${note.attachment.name}
          </a>
        </div>
      `;
    }

    li.innerHTML = `
      <div>
        <span><strong>${date}:</strong> ${note.text.substring(0,100)}${note.text.length > 100 ? '...' : ''}</span>
        ${attachmentHtml}
      </div>
      <div class="actions">
        <button data-id="${note.id}" class="delete-general-note" aria-label="Eliminar nota médica del ${date}">Eliminar</button>
      </div>
    `;
    generalNotesListEl.appendChild(li);
  });
  document.querySelectorAll('.delete-general-note').forEach(button => {
    button.addEventListener('click', handleDeleteGeneralNote);
  });
}

// --- Manejadores de Eventos ---
function handleSaveUsername(event: Event) {
  event.preventDefault();
  if (usernameInputEl && usernameInputEl.value.trim() !== '') {
    userProfile.username = usernameInputEl.value.trim();
    saveDataToLocalStorage();
    renderUserProfile();
    alert('Nombre de usuario guardado.');
  } else {
    alert('Por favor, ingresa un nombre de usuario.');
  }
}

function handleAddReminder(event: Event) {
  event.preventDefault();
  if (medicationNameInputEl && medicationTimeInputEl) {
    const name = medicationNameInputEl.value.trim();
    const time = medicationTimeInputEl.value;
    const dose = medicationDoseInputEl?.value.trim() || undefined;

    if (name && time) {
      const newReminder: MedicationReminder = { id: Date.now().toString(), name, time, dose };
      reminders.push(newReminder);
      saveDataToLocalStorage();
      renderReminders();
      startReminderChecks(); 
      addReminderFormEl?.reset();
    } else {
      alert('Por favor, completa el nombre del medicamento y la hora.');
    }
  }
}

function handleDeleteReminder(event: Event) {
  const target = event.target as HTMLButtonElement;
  const id = target.dataset.id;
  if (id) {
    reminders = reminders.filter(r => r.id !== id);
    saveDataToLocalStorage();
    renderReminders();
    startReminderChecks(); 
  }
}

function handleAddContact(event: Event) {
  event.preventDefault();
  if (contactNameInputEl && contactPhoneInputEl) {
    const name = contactNameInputEl.value.trim();
    const phone = contactPhoneInputEl.value.trim();
    if (name && phone) {
      const newContact: EmergencyContact = { id: Date.now().toString(), name, phone };
      contacts.push(newContact);
      saveDataToLocalStorage();
      renderContacts();
      addContactFormEl?.reset();
    } else {
      alert('Por favor, completa el nombre y el teléfono del contacto.');
    }
  }
}

function handleDeleteContact(event: Event) {
  const target = event.target as HTMLButtonElement;
  const id = target.dataset.id;
  if (id) {
    contacts = contacts.filter(c => c.id !== id);
    saveDataToLocalStorage();
    renderContacts();
  }
}

function handleCallContact(event: Event) {
  const target = event.target as HTMLButtonElement;
  const phone = target.dataset.phone;
  if (phone) {
    window.location.href = `tel:${phone}`;
  }
}

function handleAddBpNote(event: Event) {
  event.preventDefault();
  if (bpDateInputEl && bpSystolicInputEl && bpDiastolicInputEl) {
    const date = bpDateInputEl.value;
    const systolic = parseInt(bpSystolicInputEl.value, 10);
    const diastolic = parseInt(bpDiastolicInputEl.value, 10);
    const pulse = bpPulseInputEl?.value ? parseInt(bpPulseInputEl.value, 10) : undefined;

    if (date && !isNaN(systolic) && !isNaN(diastolic)) {
      const newNote: BloodPressureNote = { id: Date.now().toString(), date, systolic, diastolic, pulse };
      bpNotes.push(newNote);
      saveDataToLocalStorage();
      renderBpNotes();
      addBpNoteFormEl?.reset();
    } else {
      alert('Por favor, completa la fecha y los valores de presión arterial.');
    }
  }
}

function handleDeleteBpNote(event: Event) {
  const target = event.target as HTMLButtonElement;
  const id = target.dataset.id;
  if (id) {
    bpNotes = bpNotes.filter(n => n.id !== id);
    saveDataToLocalStorage();
    renderBpNotes();
  }
}

async function handleAddGeneralNote(event: Event) {
  event.preventDefault();
  if (generalNoteTextInputEl) {
    const text = generalNoteTextInputEl.value.trim();
    let attachmentData: GeneralNoteAttachment | undefined = undefined;

    if (generalNoteAttachmentInputEl && generalNoteAttachmentInputEl.files && generalNoteAttachmentInputEl.files.length > 0) {
      const file = generalNoteAttachmentInputEl.files[0];
      // Simple size check: 5MB limit for example
      if (file.size > 5 * 1024 * 1024) { 
        alert('El archivo es demasiado grande. El límite es de 5MB.');
        if (generalNoteAttachmentInputEl) generalNoteAttachmentInputEl.value = ''; // Clear file input
        if (attachmentFilenameDisplayEl) attachmentFilenameDisplayEl.textContent = '';
        return;
      }
      try {
        attachmentData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result as string });
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      } catch (error) {
        console.error("Error al leer el archivo:", error);
        alert('Hubo un error al procesar el archivo adjunto.');
        return;
      }
    }

    if (text || attachmentData) { // Save if there's text OR an attachment
      const newNote: GeneralNote = { 
        id: Date.now().toString(), 
        text: text, // text can be empty if there's an attachment
        timestamp: Date.now(),
        attachment: attachmentData 
      };
      generalNotes.push(newNote);
      saveDataToLocalStorage();
      renderGeneralNotes();
      addGeneralNoteFormEl?.reset();
      if (generalNoteAttachmentInputEl) generalNoteAttachmentInputEl.value = '';
      if (attachmentFilenameDisplayEl) attachmentFilenameDisplayEl.textContent = '';

    } else {
      alert('Por favor, escribe algo en la nota o adjunta un archivo.');
    }
  }
}

function handleDeleteGeneralNote(event: Event) {
  const target = event.target as HTMLButtonElement;
  const id = target.dataset.id;
  if (id) {
    generalNotes = generalNotes.filter(n => n.id !== id);
    saveDataToLocalStorage();
    renderGeneralNotes();
  }
}

// --- Lógica de Navegación ---
function handleNavigation(event: Event) {
  const target = event.target as HTMLElement;
  if (target.matches('.nav-button')) {
    const sectionId = target.dataset.section;
    if (sectionId) {
      document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active-section');
      });
      document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('active');
      });

      const activeSection = document.getElementById(`${sectionId}-section`);
      if (activeSection) {
        activeSection.classList.add('active-section');
      }
      target.classList.add('active');
    }
  }
}

// --- Lógica de Recordatorios con Pop-up y Sonido ---

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

// Function to play a generic beep using Web Audio API
function playGenericBeep() {
  ensureAudioContext(); // Ensure AudioContext is initialized and resumed
  if (!audioContext) {
    console.warn("Web Audio API not supported or context couldn't be initialized.");
    return;
  }

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine'; // Sine wave for a gentle beep
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Frequency in hertz (e.g., 600Hz)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume (0 to 1)

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3); // Beep duration (0.3 seconds)
  } catch (error) {
    console.warn("Error playing generic beep:", error);
  }
}

async function playReminderSound() {
  ensureAudioContext(); // Important for custom audio playback
  let soundPlayed = false;
  if (reminderSoundEl && reminderSoundEl.src) {
    try {
      await reminderSoundEl.play();
      soundPlayed = true;
    } catch (error) {
      console.warn("No se pudo reproducir el sonido del recordatorio desde <audio> (puede requerir interacción del usuario o archivo no accesible):", error);
    }
  }

  if (!soundPlayed) {
    // console.log("Fallback: Intentando reproducir sonido genérico (beep).");
    playGenericBeep();
  }
}

function showReminderPopup(reminder: MedicationReminder) {
  if (!reminderModalEl || !modalMedicationNameEl || !modalMedicationDoseEl || !modalMedicationDoseContainerEl || !modalUnderstoodButtonEl || !modalDescriptionTextEl) return;

  modalMedicationNameEl.textContent = reminder.name;
  if (reminder.dose) {
    modalMedicationDoseEl.textContent = reminder.dose;
    modalMedicationDoseContainerEl.hidden = false;
  } else {
    modalMedicationDoseContainerEl.hidden = true;
  }
  
  modalDescriptionTextEl.textContent = `Es hora de tomar: ${reminder.name}${reminder.dose ? ` (${reminder.dose})` : ''}.`;

  reminderModalEl.hidden = false;
  modalUnderstoodButtonEl.focus(); // Focus for accessibility
}

function hideReminderPopup() {
  if (reminderModalEl) {
    reminderModalEl.hidden = true;
  }
}

function checkReminders() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  reminders.forEach(reminder => {
    if (reminder.time === currentTime) {
      const lastAlertedKey = `reminder_alerted_${reminder.id}_${currentTime}`;
      if (!sessionStorage.getItem(lastAlertedKey)) {
        playReminderSound();
        showReminderPopup(reminder); // Show custom pop-up
        sessionStorage.setItem(lastAlertedKey, 'true'); 

        setTimeout(() => {
            sessionStorage.removeItem(lastAlertedKey);
        }, 60 * 1000);
      }
    }
  });
}

function startReminderChecks() {
    if (currentIntervalId !== null) {
        window.clearInterval(currentIntervalId);
    }
    checkReminders(); 
    currentIntervalId = window.setInterval(checkReminders, 30 * 1000); 
}


// --- Inicialización de la Aplicación ---
function initializeApp() {
  // Obtener referencias a elementos del DOM
  userGreetingEl = document.getElementById('user-greeting');
  usernameInputEl = document.getElementById('username-input') as HTMLInputElement;
  saveUsernameButtonEl = document.getElementById('save-username-button') as HTMLButtonElement;

  remindersListEl = document.getElementById('reminders-list');
  addReminderFormEl = document.getElementById('add-reminder-form') as HTMLFormElement;
  medicationNameInputEl = document.getElementById('medication-name') as HTMLInputElement;
  medicationTimeInputEl = document.getElementById('medication-time') as HTMLInputElement;
  medicationDoseInputEl = document.getElementById('medication-dose') as HTMLInputElement;

  contactsListEl = document.getElementById('contacts-list');
  addContactFormEl = document.getElementById('add-contact-form') as HTMLFormElement;
  contactNameInputEl = document.getElementById('contact-name') as HTMLInputElement;
  contactPhoneInputEl = document.getElementById('contact-phone') as HTMLInputElement;

  bpNotesListEl = document.getElementById('bp-notes-list');
  addBpNoteFormEl = document.getElementById('add-bp-note-form') as HTMLFormElement;
  bpDateInputEl = document.getElementById('bp-date') as HTMLInputElement;
  bpSystolicInputEl = document.getElementById('bp-systolic') as HTMLInputElement;
  bpDiastolicInputEl = document.getElementById('bp-diastolic') as HTMLInputElement;
  bpPulseInputEl = document.getElementById('bp-pulse') as HTMLInputElement;

  generalNotesListEl = document.getElementById('general-notes-list');
  addGeneralNoteFormEl = document.getElementById('add-general-note-form') as HTMLFormElement;
  generalNoteTextInputEl = document.getElementById('general-note-text') as HTMLTextAreaElement;
  generalNoteAttachmentInputEl = document.getElementById('general-note-attachment') as HTMLInputElement;
  attachmentFilenameDisplayEl = document.getElementById('attachment-filename-display');


  reminderSoundEl = document.getElementById('reminder-sound') as HTMLAudioElement;
  
  // Modal elements
  reminderModalEl = document.getElementById('reminder-modal');
  modalMedicationNameEl = document.getElementById('modal-medication-name');
  modalMedicationDoseEl = document.getElementById('modal-medication-dose');
  modalMedicationDoseContainerEl = document.getElementById('modal-medication-dose-container');
  modalUnderstoodButtonEl = document.getElementById('modal-understood-button') as HTMLButtonElement;
  modalDescriptionTextEl = document.getElementById('modal-description-text');

  // Cargar datos
  loadDataFromLocalStorage();

  // Renderizar contenido inicial
  renderUserProfile();
  renderReminders();
  renderContacts();
  renderBpNotes();
  renderGeneralNotes();

  // Configurar manejadores de eventos
  saveUsernameButtonEl?.addEventListener('click', handleSaveUsername);
  addReminderFormEl?.addEventListener('submit', handleAddReminder);
  addContactFormEl?.addEventListener('submit', handleAddContact);
  addBpNoteFormEl?.addEventListener('submit', handleAddBpNote);
  addGeneralNoteFormEl?.addEventListener('submit', handleAddGeneralNote);

  generalNoteAttachmentInputEl?.addEventListener('change', () => {
    if (generalNoteAttachmentInputEl && generalNoteAttachmentInputEl.files && generalNoteAttachmentInputEl.files.length > 0) {
        if (attachmentFilenameDisplayEl) {
            attachmentFilenameDisplayEl.textContent = `Archivo: ${generalNoteAttachmentInputEl.files[0].name}`;
        }
    } else {
        if (attachmentFilenameDisplayEl) {
            attachmentFilenameDisplayEl.textContent = '';
        }
    }
  });

  document.getElementById('main-nav')?.addEventListener('click', handleNavigation);
  
  // Event listeners for closing the modal
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', hideReminderPopup);
  });
  
  // Ensure AudioContext is available for sounds, attempt to create/resume on first user interaction
  // This helps with browser autoplay policies.
  const initAudio = () => {
    ensureAudioContext();
    document.body.removeEventListener('click', initAudio);
    document.body.removeEventListener('touchstart', initAudio);
  };
  document.body.addEventListener('click', initAudio, { once: true });
  document.body.addEventListener('touchstart', initAudio, { once: true });


  // Iniciar comprobación de recordatorios
  startReminderChecks();
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);