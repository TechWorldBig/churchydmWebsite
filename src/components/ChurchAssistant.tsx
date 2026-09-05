import { isSensitiveRequest, isInstructionOverride, SENSITIVE_REPLY, OUT_OF_SCOPE_REPLY } from '../../shared/assistantPolicy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bird, Bot, Send, X } from 'lucide-react'
import { askChurchAssistant, getAttendance, getMembers } from '../data/api'
import type { AssistantTurn } from '../data/api'
import { getBibleReply, isBibleRequest } from '../data/bibleApi'
import type { BibleLanguage } from '../data/bibleApi'
import type { AttendanceRecord, Member } from '../data/memberStore'

type Message = {
  id: string
  role: 'bot' | 'user'
  text: string
}

const initialMessages: Message[] = [
  { id: 'welcome', role: 'bot', text: 'Hi I am YDM warriors and I am your best friend to help you.' },
  { id: 'ask-name', role: 'bot', text: 'What is your name?' },
]

type AssistantCopy = {
  languageChanged: (name: string) => string
  attendanceMultiple: string
  attendanceMissing: string
  attendanceEmpty: (name: string) => string
  attendanceUnavailable: string
  attendanceSummary: (name: string, present: number, total: number, percentage: number, date: string, status: string, note: string) => string
  attendanceJoke: (name: string, percentage: number) => string
  attendanceCorrection: string
  sensitiveRequest: string
  present: string
  absent: string
  note: string
  checkingAttendance: string
  checkingMember: string
  lookingUpBible: string
  thinking: string
  assistantUnavailable: string
  placeholder: string
  memberSummary: (name: string, role: string) => string
  memberWithoutRole: (name: string) => string
  memberMultiple: string
  memberMissing: string
  memberUnavailable: string
}

const assistantCopy: Record<BibleLanguage, AssistantCopy> = {
  en: {
    languageChanged: (name) => `Of course, ${name}. I will continue in English.`,
    attendanceMultiple: 'I found more than one matching member. Please ask again using the member\'s full registered name.',
    attendanceMissing: 'I could not find that member\'s attendance profile. Please use the full name registered by the YDM administrator.',
    attendanceEmpty: (name) => `${name} is registered, but no attendance has been recorded yet. The attendance book is still waiting for its first hello!`,
    attendanceUnavailable: 'Sorry, I could not load the attendance records right now. Please try again in a moment or open the Attendance page.',
    attendanceSummary: (name, present, total, percentage, date, status, note) => `${name}'s attendance is ${present}/${total} (${percentage}%).\nLatest record: ${date} - ${status}${note}`,
    attendanceJoke: (name, percentage) => percentage >= 80
      ? `Nice! The attendance register knows ${name} very well.`
      : percentage >= 50
        ? `Not bad! ${name}'s chair would still like a few more visits.`
        : `Looks like ${name}'s chair has started a missing-person prayer!`,
    attendanceCorrection: 'Please inform the attendance admin Kabin.',
    sensitiveRequest: SENSITIVE_REPLY,
    present: 'Present',
    absent: 'Absent',
    note: 'Note',
    checkingAttendance: 'Checking the attendance record...',
    checkingMember: 'Checking the YDM member register...',
    lookingUpBible: 'Looking up that Bible passage...',
    thinking: 'Preparing your answer...',
    assistantUnavailable: 'I could not answer that question right now. Please try again in a moment.',
    placeholder: 'Ask a question...',
    memberSummary: (name, role) => `${name} is a YDM member. Position: ${role}.`,
    memberWithoutRole: (name) => `${name} is a YDM member, but no position is listed in the member register.`,
    memberMultiple: 'I found more than one matching member. Please ask again using the member\'s full registered name.',
    memberMissing: 'I could not find a matching person in the YDM member register. Please check the name and try again.',
    memberUnavailable: 'I could not load the YDM member register right now. Please try again in a moment.',
  },
  ta: {
    languageChanged: (name) => `நிச்சயமாக, ${name}. இனிமேல் நான் தமிழில் தொடர்கிறேன்.`,
    attendanceMultiple: 'ஒன்றுக்கு மேற்பட்ட பொருந்தும் உறுப்பினர்கள் உள்ளனர். உறுப்பினரின் பதிவு செய்யப்பட்ட முழுப் பெயரைப் பயன்படுத்தி மீண்டும் கேட்கவும்.',
    attendanceMissing: 'அந்த உறுப்பினரின் வருகைப்பதிவு காணப்படவில்லை. YDM நிர்வாகியிடம் பதிவு செய்யப்பட்ட முழுப் பெயரைப் பயன்படுத்தவும்.',
    attendanceEmpty: (name) => `${name} பதிவு செய்யப்பட்டுள்ளார்; ஆனால் வருகை இன்னும் பதிவு செய்யப்படவில்லை. வருகைப் பதிவேடு முதல் வணக்கத்திற்காகக் காத்திருக்கிறது!`,
    attendanceUnavailable: 'மன்னிக்கவும், இப்போது வருகைப்பதிவுகளை ஏற்ற முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',
    attendanceSummary: (name, present, total, percentage, date, status, note) => `${name} அவர்களின் வருகை ${present}/${total} (${percentage}%).\nசமீபத்திய பதிவு: ${date} - ${status}${note}`,
    attendanceJoke: (name, percentage) => percentage >= 80
      ? `அருமை! வருகைப் பதிவேட்டுக்கு ${name}-ஐ நன்றாகத் தெரியும்.`
      : percentage >= 50
        ? `பரவாயில்லை! ${name}-ன் நாற்காலி இன்னும் சில வருகைகளை எதிர்பார்க்கிறது.`
        : `${name}-ஐ காணாமல் நாற்காலியே ஜெபிக்க ஆரம்பித்துவிட்டது!`,
    attendanceCorrection: 'தயவுசெய்து வருகைப்பதிவு நிர்வாகி Kabin-க்கு தெரிவிக்கவும்.',
    sensitiveRequest: SENSITIVE_REPLY,
    present: 'வந்திருந்தார்',
    absent: 'வரவில்லை',
    note: 'குறிப்பு',
    checkingAttendance: 'வருகைப்பதிவைச் சரிபார்க்கிறேன்...',
    checkingMember: 'YDM உறுப்பினர் பதிவைச் சரிபார்க்கிறேன்...',
    lookingUpBible: 'அந்த வேதாகமப் பகுதியைத் தேடுகிறேன்...',
    thinking: 'சிந்தித்து தொடர்புடைய ஆதாரங்களைச் சரிபார்க்கிறேன்...',
    assistantUnavailable: 'இப்போது அந்தக் கேள்விக்குப் பதிலளிக்க முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',
    placeholder: 'ஒரு கேள்வியைக் கேளுங்கள்...',
    memberSummary: (name, role) => `${name} ஒரு YDM உறுப்பினர். பொறுப்பு: ${role}.`,
    memberWithoutRole: (name) => `${name} ஒரு YDM உறுப்பினர்; ஆனால் உறுப்பினர் பதிவில் பொறுப்பு குறிப்பிடப்படவில்லை.`,
    memberMultiple: 'ஒன்றுக்கு மேற்பட்ட பொருந்தும் உறுப்பினர்கள் உள்ளனர். உறுப்பினரின் பதிவு செய்யப்பட்ட முழுப் பெயரைப் பயன்படுத்தி மீண்டும் கேட்கவும்.',
    memberMissing: 'YDM உறுப்பினர் பதிவில் பொருந்தும் நபரைக் கண்டுபிடிக்க முடியவில்லை. பெயரைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    memberUnavailable: 'YDM உறுப்பினர் பதிவை இப்போது ஏற்ற முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',
  },
  ml: {
    languageChanged: (name) => `തീർച്ചയായും, ${name}. ഇനി ഞാൻ മലയാളത്തിൽ തുടരാം.`,
    attendanceMultiple: 'പൊരുത്തപ്പെടുന്ന ഒന്നിലധികം അംഗങ്ങളെ കണ്ടെത്തി. അംഗത്തിന്റെ രജിസ്റ്റർ ചെയ്ത മുഴുവൻ പേര് ഉപയോഗിച്ച് വീണ്ടും ചോദിക്കുക.',
    attendanceMissing: 'ആ അംഗത്തിന്റെ ഹാജർ പ്രൊഫൈൽ കണ്ടെത്താനായില്ല. YDM അഡ്മിനിസ്ട്രേറ്ററുടെ പക്കൽ രജിസ്റ്റർ ചെയ്ത മുഴുവൻ പേര് ഉപയോഗിക്കുക.',
    attendanceEmpty: (name) => `${name} രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്; എന്നാൽ ഹാജർ ഇതുവരെ രേഖപ്പെടുത്തിയിട്ടില്ല. ഹാജർ പുസ്തകം ആദ്യത്തെ ഹലോയ്ക്കായി കാത്തിരിക്കുന്നു!`,
    attendanceUnavailable: 'ക്ഷമിക്കണം, ഹാജർ വിവരങ്ങൾ ഇപ്പോൾ ലഭ്യമാക്കാനായില്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.',
    attendanceSummary: (name, present, total, percentage, date, status, note) => `${name}-ന്റെ ഹാജർ ${present}/${total} (${percentage}%).\nഏറ്റവും പുതിയ രേഖ: ${date} - ${status}${note}`,
    attendanceJoke: (name, percentage) => percentage >= 80
      ? `കൊള്ളാം! ഹാജർ പുസ്തകത്തിന് ${name}-നെ നന്നായി അറിയാം.`
      : percentage >= 50
        ? `മോശമല്ല! ${name}-ന്റെ കസേര ഇനിയും കുറച്ച് സന്ദർശനങ്ങൾ പ്രതീക്ഷിക്കുന്നു.`
        : `${name}-നെ കാണാതെ കസേര പോലും പ്രാർത്ഥിക്കാൻ തുടങ്ങി!`,
    attendanceCorrection: 'ദയവായി ഹാജർ അഡ്മിൻ Kabin-നെ അറിയിക്കുക.',
    sensitiveRequest: SENSITIVE_REPLY,
    present: 'ഹാജർ',
    absent: 'ഹാജരായില്ല',
    note: 'കുറിപ്പ്',
    checkingAttendance: 'ഹാജർ രേഖ പരിശോധിക്കുന്നു...',
    checkingMember: 'YDM അംഗങ്ങളുടെ രജിസ്റ്റർ പരിശോധിക്കുന്നു...',
    lookingUpBible: 'ആ ബൈബിൾ ഭാഗം തിരയുന്നു...',
    thinking: 'ചിന്തിക്കുകയും ബന്ധപ്പെട്ട ഉറവിടങ്ങൾ പരിശോധിക്കുകയും ചെയ്യുന്നു...',
    assistantUnavailable: 'ആ ചോദ്യത്തിന് ഇപ്പോൾ മറുപടി നൽകാനായില്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.',
    placeholder: 'ഒരു ചോദ്യം ചോദിക്കുക...',
    memberSummary: (name, role) => `${name} ഒരു YDM അംഗമാണ്. സ്ഥാനം: ${role}.`,
    memberWithoutRole: (name) => `${name} ഒരു YDM അംഗമാണ്; എന്നാൽ അംഗങ്ങളുടെ രജിസ്റ്ററിൽ സ്ഥാനം രേഖപ്പെടുത്തിയിട്ടില്ല.`,
    memberMultiple: 'പൊരുത്തപ്പെടുന്ന ഒന്നിലധികം അംഗങ്ങളെ കണ്ടെത്തി. അംഗത്തിന്റെ രജിസ്റ്റർ ചെയ്ത മുഴുവൻ പേര് ഉപയോഗിച്ച് വീണ്ടും ചോദിക്കുക.',
    memberMissing: 'YDM അംഗങ്ങളുടെ രജിസ്റ്ററിൽ പൊരുത്തപ്പെടുന്ന വ്യക്തിയെ കണ്ടെത്താനായില്ല. പേര് പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.',
    memberUnavailable: 'YDM അംഗങ്ങളുടെ രജിസ്റ്റർ ഇപ്പോൾ ലഭ്യമാക്കാനായില്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.',
  },
}

function getMentionedLanguage(input: string): BibleLanguage | null {
  const lower = input.toLocaleLowerCase().trim()
  const mentioned = [
    (lower.includes('english') ? 'en' : null),
    (lower.includes('tamil') || /[\u0B80-\u0BFF]/u.test(input) ? 'ta' : null),
    (lower.includes('malayalam') || /[\u0D00-\u0D7F]/u.test(input) ? 'ml' : null),
  ].filter((language): language is BibleLanguage => language !== null)

  return mentioned.length === 1 ? mentioned[0] : null
}

function getRequestedLanguage(input: string): BibleLanguage | null {
  const lower = input.toLocaleLowerCase().trim()
  const isLanguageCommand = ['tamil', 'malayalam', 'english', 'தமிழ்', 'മലയാളം'].includes(lower)
    || ['continue', 'speak', 'talk', 'reply', 'respond', 'language', 'switch', 'change', 'use'].some((word) => lower.includes(word))

  if (!isLanguageCommand) return null
  return getMentionedLanguage(input)
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

function extractName(input: string): string {
  let value = input.trim().split(/\r?\n/u)[0]
  const englishIntroduction = value.match(/^(?:(?:hello|hi)[,!]?\s+)?(?:my\s+name\s+is|name\s+is|i\s+am|i['’]?m|im|this\s+is|call\s+me|myself)\s+(.+)$/iu)
  const englishSuffix = value.match(/^(.+?)\s+is\s+my\s+name[.!?]*$/iu)

  if (englishIntroduction) {
    value = englishIntroduction[1]
  } else if (englishSuffix) {
    value = englishSuffix[1]
  } else {
    value = value
      .replace(/^(?:என்|என்னுடைய)\s+பெயர்(?:\s+என்பது|\s*:)?\s*/u, '')
      .replace(/^நான்\s+/u, '')
      .replace(/^(?:എന്റെ|എൻ്റെ)\s+പേര്(?:\s*:)?\s*/u, '')
      .replace(/^ഞാൻ\s+/u, '')
  }

  const cleaned = value.replace(/^[\s"'`‘’“”]+|[\s"'`,.!?‘’“”]+$/gu, '').trim()
  return (cleaned || input.trim()).slice(0, 100)
}

function isAttendanceRequest(input: string): boolean {
  const lower = input.toLocaleLowerCase()
  const asksGeneralQuestion = ['why', 'important', 'importance', 'benefit', 'meaning', 'purpose', 'ஏன்', 'முக்கிய', 'എന്തുകൊണ്ട്', 'പ്രാധാന്യം']
    .some((term) => lower.includes(term))
  if (asksGeneralQuestion) return false

  return lower.includes('attendance')
    || lower.includes('attended')
    || lower.includes('present')
    || lower.includes('absent')
    || lower.includes('வருகை')
    || lower.includes('ഹാജർ')
}

function isAttendanceCorrectionRequest(input: string): boolean {
  const normalized = input.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const correctionTerms = [
    'marked absent',
    'absent by mistake',
    'attendance is wrong',
    'wrong attendance',
    'correct my attendance',
    'change my attendance',
    'நான் வந்தேன்',
    'நான் வந்திருந்தேன்',
    'நான் கலந்து கொண்டேன்',
    'வருகை தவறு',
    'வருகையை திருத்த',
    'ഞാൻ ഹാജരായിരുന്നു',
    'ഞാൻ വന്നിരുന്നു',
    'ഞാൻ പങ്കെടുത്തു',
    'ഹാജർ തെറ്റ്',
    'ഹാജർ തിരുത്ത',
  ]

  return /\bi\s+(?:was\s+|am\s+)?present\b/u.test(normalized)
    || /\bi\s+(?:came|attended)\b/u.test(normalized)
    || correctionTerms.some((term) => normalized.includes(term))
}

function isMemberRequest(input: string): boolean {
  const lower = input.toLocaleLowerCase()
  const asksGeneralRole = (lower.includes('role of') || lower.includes('importance of'))
    && !lower.includes('member')
    && !lower.includes('ydm')
  if (asksGeneralRole) return false

  return lower.includes('member')
    || lower.includes('position')
    || lower.includes('role')
    || (lower.includes('who is') && lower.includes('ydm'))
    || lower.includes('உறுப்பினர்')
    || lower.includes('பதவி')
    || lower.includes('அங்கம்')
    || lower.includes('സ്ഥാനം')
}

function findMemberByName(members: Member[], requestedName: string): Member | null | 'multiple' {
  const normalized = normalizeName(requestedName)
  const exactMatch = members.find((member) => normalizeName(member.name) === normalized)
  if (exactMatch) return exactMatch

  const partialMatches = members.filter((member) => {
    const memberName = normalizeName(member.name)
    return memberName.startsWith(`${normalized} `) || memberName.split(' ').includes(normalized)
  })

  if (partialMatches.length === 1) return partialMatches[0]
  if (partialMatches.length > 1) return 'multiple'
  return null
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function findMemberFromQuestion(members: Member[], input: string, conversationName: string): Member | null | 'multiple' {
  const normalizedInput = normalizeSearchText(input)
  const paddedInput = ` ${normalizedInput} `
  const fullNameMatches = members.filter((member) => {
    const memberName = normalizeSearchText(member.name)
    return memberName.length > 0 && paddedInput.includes(` ${memberName} `)
  })

  if (fullNameMatches.length === 1) return fullNameMatches[0]
  if (fullNameMatches.length > 1) return 'multiple'

  const inputTokens = new Set(normalizedInput.split(' '))
  const firstNameMatches = members.filter((member) => normalizeSearchText(member.name)
    .split(' ')
    .some((token) => token.length >= 3 && inputTokens.has(token)))

  if (firstNameMatches.length === 1) return firstNameMatches[0]
  if (firstNameMatches.length > 1) return 'multiple'

  if (/\b(i|me|my)\b/u.test(normalizedInput)) return findMemberByName(members, conversationName)
  return null
}

function formatAttendanceDate(value: string, language: BibleLanguage): string {
  const locale = language === 'ta' ? 'ta-IN' : language === 'ml' ? 'ml-IN' : 'en-IN'
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function buildAttendanceReply(input: string, conversationName: string, language: BibleLanguage): Promise<string> {
  const copy = assistantCopy[language]
  try {
    const [members, records] = await Promise.all([getMembers(), getAttendance()])
    const member = findMemberFromQuestion(members, input, conversationName)

    if (member === 'multiple') {
      return copy.attendanceMultiple
    }

    if (!member) {
      return copy.attendanceMissing
    }

    const memberRecords = records
      .filter((record: AttendanceRecord) => record.memberId === member.id || (!record.memberId && normalizeName(record.name) === normalizeName(member.name)))
      .sort((a: AttendanceRecord, b: AttendanceRecord) => b.date.localeCompare(a.date))

    if (memberRecords.length === 0) {
      return copy.attendanceEmpty(member.name)
    }

    const present = memberRecords.filter((record: AttendanceRecord) => record.present).length
    const percentage = Math.round((present / memberRecords.length) * 100)
    const latest = memberRecords[0]

    const status = latest.present ? copy.present : copy.absent
    const note = latest.note ? `\n${copy.note}: ${latest.note}` : ''
    const summary = copy.attendanceSummary(member.name, present, memberRecords.length, percentage, formatAttendanceDate(latest.date, language), status, note)
    return `${summary}\n${copy.attendanceJoke(member.name, percentage)}`
  } catch {
    return copy.attendanceUnavailable
  }
}

async function buildMemberReply(input: string, conversationName: string, language: BibleLanguage): Promise<string> {
  const copy = assistantCopy[language]
  try {
    const members = await getMembers()
    const member = findMemberFromQuestion(members, input, conversationName)

    if (member === 'multiple') return copy.memberMultiple
    if (!member) return copy.memberMissing
    if (!member.role.trim()) return copy.memberWithoutRole(member.name)
    return copy.memberSummary(member.name, member.role)
  } catch {
    return copy.memberUnavailable
  }
}

export default function ChurchAssistant() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [isChirping, setIsChirping] = useState(false)
  const [preferredLanguage, setPreferredLanguage] = useState<BibleLanguage>('en')
  const [aiHistory, setAiHistory] = useState<AssistantTurn[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const placeholder = useMemo(
    () => (name ? assistantCopy[preferredLanguage].placeholder : 'Enter your name...'),
    [name, preferredLanguage],
  )

  function chirp() {
    setIsChirping(true)
    window.setTimeout(() => setIsChirping(false), 780)
    try {
      const BrowserAudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!BrowserAudioContext) return
      const context = new BrowserAudioContext()
      const startAt = context.currentTime
      ;[[0, 1_100, 1_650], [.16, 1_350, 2_000], [.32, 1_500, 2_250]].forEach(([offset, from, to]) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(from, startAt + offset)
        oscillator.frequency.exponentialRampToValueAtTime(to, startAt + offset + .11)
        gain.gain.setValueAtTime(.0001, startAt + offset)
        gain.gain.exponentialRampToValueAtTime(.07, startAt + offset + .018)
        gain.gain.exponentialRampToValueAtTime(.0001, startAt + offset + .13)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(startAt + offset)
        oscillator.stop(startAt + offset + .14)
      })
      window.setTimeout(() => void context.close(), 650)
    } catch {
      // Audio may be disabled by the device or browser; the visual chirp still plays.
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || isReplying) return

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text }

    if (isSensitiveRequest(text) || isInstructionOverride(text)) {
      setMessages((current) => [
        ...current,
        userMessage,
        { id: crypto.randomUUID(), role: 'bot', text: isSensitiveRequest(text) ? SENSITIVE_REPLY : OUT_OF_SCOPE_REPLY },
      ])
      setInput('')
      return
    }

    if (!name) {
      const enteredName = extractName(text)
      setName(enteredName)
      setMessages((current) => [...current, userMessage, { id: crypto.randomUUID(), role: 'bot', text: `Welcome, ${enteredName}. How can I help you today?` }])
      setInput('')
      return
    }

    setInput('')

    const requestedLanguage = getRequestedLanguage(text)
    if (requestedLanguage) {
      setPreferredLanguage(requestedLanguage)
      setMessages((current) => [
        ...current,
        userMessage,
        { id: crypto.randomUUID(), role: 'bot', text: assistantCopy[requestedLanguage].languageChanged(name) },
      ])
      return
    }

    const inlineLanguage = getMentionedLanguage(text)
    const responseLanguage = inlineLanguage ?? preferredLanguage
    if (inlineLanguage && inlineLanguage !== preferredLanguage) setPreferredLanguage(inlineLanguage)


    if (isAttendanceCorrectionRequest(text)) {
      setMessages((current) => [
        ...current,
        userMessage,
        { id: crypto.randomUUID(), role: 'bot', text: assistantCopy[responseLanguage].attendanceCorrection },
      ])
      return
    }

    const attendanceRequest = isAttendanceRequest(text)
    const memberRequest = isMemberRequest(text)
    const bibleRequest = isBibleRequest(text)
    if (attendanceRequest || memberRequest || bibleRequest) {
      const pendingId = crypto.randomUUID()
      const copy = assistantCopy[responseLanguage]
      const pendingText = attendanceRequest
        ? copy.checkingAttendance
        : memberRequest
          ? copy.checkingMember
          : copy.lookingUpBible
      setIsReplying(true)
      setMessages((current) => [...current, userMessage, { id: pendingId, role: 'bot', text: pendingText }])

      const reply = attendanceRequest
        ? await buildAttendanceReply(text, name, responseLanguage)
        : memberRequest
          ? await buildMemberReply(text, name, responseLanguage)
          : await getBibleReply(text, responseLanguage)
      setMessages((current) => current.map((message) => message.id === pendingId ? { ...message, text: reply } : message))
      setIsReplying(false)
      return
    }

    const pendingId = crypto.randomUUID()
    const copy = assistantCopy[responseLanguage]
    setIsReplying(true)
    setMessages((current) => [...current, userMessage, { id: pendingId, role: 'bot', text: copy.thinking }])

    try {
      const { answer } = await askChurchAssistant(text, name, responseLanguage, aiHistory)
      setAiHistory((current) => [
        ...current,
        { role: 'user', content: text },
        { role: 'assistant', content: answer },
      ].slice(-8) as AssistantTurn[])
      setMessages((current) => current.map((message) => message.id === pendingId ? { ...message, text: answer } : message))
    } catch {
      setMessages((current) => current.map((message) => message.id === pendingId ? { ...message, text: copy.assistantUnavailable } : message))
    } finally {
      setIsReplying(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close church assistant' : 'Open church assistant'}
        onClick={() => { chirp(); setOpen((value) => !value) }}
        className={`church-assistant-fab fixed z-[70] grid h-14 w-14 place-items-center rounded-full bg-[#e3bc62] text-[#071f19] shadow-[0_18px_40px_rgba(4,21,17,.25)] transition hover:-translate-y-1 ${isChirping ? 'bird-chirping' : ''}`}
      >
        <Bird size={22} />
      </button>

      {open && (
        <div role="dialog" aria-label="YDM assistant" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); document.querySelector<HTMLButtonElement>('.church-assistant-fab')?.focus() } }} className="church-assistant-panel fixed z-[70] flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#061914] text-white shadow-[0_24px_70px_rgba(4,21,17,.4)]">
          <div className="flex min-w-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="assistant-header-bot grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e3bc62] text-[#071f19]">
                <Bot size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black">YDM warriors</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full p-2 text-white/65 transition hover:bg-white/10 hover:text-white" aria-label="Close assistant">
              <X size={18} />
            </button>
          </div>

          <div tabIndex={0} role="log" aria-live="polite" aria-relevant="additions text" ref={listRef} className="church-assistant-messages min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`church-assistant-message max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-[#e3bc62] text-[#071f19]' : 'bg-white/8 text-white/88'}`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                aria-label={name ? "Your question" : "Your name"}
                maxLength={name ? 1500 : 100}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void sendMessage()
                }}
                placeholder={placeholder}
                disabled={isReplying}
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[#e3bc62] focus:bg-white/8"
              />
              <button type="button" onClick={() => void sendMessage()} disabled={isReplying} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e3bc62] text-[#071f19] transition hover:bg-[#f0cf82] disabled:cursor-wait disabled:opacity-60" aria-label="Send message">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
