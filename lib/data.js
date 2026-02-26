import {
  Calendar,
  Video,
  CreditCard,
  User,
  FileText,
  ShieldCheck,
  AlarmSmoke,
} from "lucide-react";

// JSON data for features
export const features = [
  {
    icon: <User className="h-6 w-6 text-fuchsia-400" />,
    title: "Find Your Perfect Match",
    description:
      "Tell us about your health needs so our system can instantly match you with doctors who have the highest success rate for your specific condition.",
  },
  {
    icon: <Calendar className="h-6 w-6 text-fuchsia-400" />,
    title: "Review & Book with Confidence",
    description:
      "Compare doctor profiles, view their Success Rate Score, and secure an appointment in just three simple steps. Your schedule, your choice.",
  },
  {
    icon: <Video className="h-6 w-6 text-fuchsia-400" />,
    title: "Seamless Virtual Care",
    description:
      "Connect instantly with your chosen doctor via secure, high-definition video. Get the expert care you need without the travel or waiting room stress.",
  },
  
  {
    icon: <ShieldCheck className="h-6 w-6 text-fuchsia-400" />,
    title: "Top-Tier Success Rate Doctors",
    description:
      "Our providers are continuously reviewed based on patient outcomes, ensuring you are consulting with doctors proven to have the highest probability of success.",
  },
  {
    icon: <FileText className="h-6 w-6 text-fuchsia-400" />,
    title: "Simple Record Management",
    description:
      "Everything in one place. Easily access and share your appointment history, doctor's notes, and recommended treatment plans on any device.",
  },
  {
    icon: <AlarmSmoke className="h-6 w-6 text-fuchsia-400" />,
    title: "Emergency / Helpline Section",
    description:
      "Displays emergency contact numbers and quick help buttons. 24x7 Emergency Line: +91 99999 88888”",
  },
];

// JSON data for testimonials
export const testimonials = [
  {
    initials: "SP",
    name: "Shaurya",
    role: "Patient",
    quote:
      "The video consultation feature saved me so much time. I was able to get medical advice without taking time off work or traveling to a clinic.",
  },
  {
    initials: "DR",
    name: "Dr. Raj",
    role: "Cardiologist",
    quote:
      "This platform has revolutionized my practice. I can now reach more patients and provide timely care without the constraints of a physical office.",
  },
  {
    initials: "JT",
    name: "Aniket",
    role: "Patient",
    quote:
      "The credit system is so convenient. I purchased a package for my family, and we've been able to consult with specialists whenever needed.",
  },
];

// JSON data for credit system benefits
export const creditBenefits = [
  "Each consultation requires <strong class='text-fuchsia-400'>2 credits</strong> regardless of duration",
  "Credits <strong class='text-fuchsia-400'>never expire</strong> - use them whenever you need",
  "Monthly subscriptions give you <strong class='text-fuchsia-400'>fresh credits every month</strong>",
  "Cancel or change your subscription <strong class='text-fuchsia-400'>anytime</strong> without penalties",
];
