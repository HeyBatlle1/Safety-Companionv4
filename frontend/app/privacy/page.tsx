"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, AlertTriangle, Download, Trash2, Mail, Globe } from "lucide-react";

const sections = [
    {
        id: "promise",
        icon: Shield,
        title: "Our Promise",
        content: "We take your privacy seriously. This isn't corporate BS - we're construction people building tools for construction people."
    },
    {
        id: "collect",
        icon: Database,
        title: "What We Collect",
        subsections: [
            {
                title: "Account Information",
                items: [
                    "Name, email, phone (via Clerk authentication)",
                    "Company name and role",
                    "Profile photo (optional)"
                ]
            },
            {
                title: "Safety Data",
                items: [
                    "Job Hazard Analysis (JHA) forms you create",
                    "Photos you upload for visual analysis",
                    "Site location and weather data",
                    "Usage logs (what features you use, when)"
                ]
            },
            {
                title: "Technical Data",
                items: [
                    "IP address",
                    "Browser type",
                    "Device information",
                    "Error logs"
                ]
            },
            {
                title: "What We DON'T Collect",
                items: [
                    "Social Security Numbers",
                    "Credit card info (handled by Stripe, not us)",
                    "Biometric data",
                    "Personal conversations outside the app"
                ],
                highlight: true
            }
        ]
    },
    {
        id: "use",
        icon: Eye,
        title: "How We Use Your Data",
        subsections: [
            {
                title: "To Provide the Service",
                items: [
                    "Analyze JHA forms with AI",
                    "Generate safety recommendations",
                    "Track site conditions and weather",
                    "Send you alerts about safety issues"
                ]
            },
            {
                title: "To Improve Safety Companion",
                items: [
                    "Fix bugs and improve performance",
                    "Develop new features",
                    "Understand which features are most useful"
                ]
            },
            {
                title: "To Communicate With You",
                items: [
                    "Send critical safety alerts",
                    "Product updates and new features",
                    "Respond to support requests",
                    "[We NEVER send marketing spam unless you opt in]"
                ]
            }
        ]
    },
    {
        id: "share",
        icon: Globe,
        title: "Who We Share Data With",
        subsections: [
            {
                title: "AI Providers (Required for Service)",
                items: [
                    "Google Gemini (for AI analysis)",
                    "Anthropic Claude (for AI analysis)",
                    "Both companies have strict data protection agreements",
                    "They DO NOT use your data to train their models",
                    "They process data and delete it after"
                ]
            },
            {
                title: "Infrastructure Providers",
                items: [
                    "Vercel (frontend hosting)",
                    "Render (backend hosting)",
                    "Neon (database - PostgreSQL)",
                    "All use enterprise-grade encryption"
                ]
            },
            {
                title: "Authentication",
                items: [
                    "Clerk (handles login/signup securely)",
                    "We never see your passwords"
                ]
            },
            {
                title: "We NEVER Share With",
                items: [
                    "Advertisers",
                    "Data brokers",
                    "Competitors",
                    "Insurance companies",
                    "OSHA (unless legally required)",
                    "Anyone else, period"
                ],
                highlight: true
            }
        ]
    },
    {
        id: "protect",
        icon: Lock,
        title: "How We Protect Your Data",
        subsections: [
            {
                title: "Encryption",
                items: [
                    "All data encrypted in transit (TLS 1.3)",
                    "Database encrypted at rest (AES-256)",
                    "API keys stored in secure vaults"
                ]
            },
            {
                title: "Access Control",
                items: [
                    "Role-based permissions (admins, managers, workers)",
                    "Multi-factor authentication available",
                    "Automatic session timeouts",
                    "IP allowlisting for enterprise accounts"
                ]
            },
            {
                title: "Monitoring",
                items: [
                    "24/7 security monitoring",
                    "Automated threat detection",
                    "Regular security audits",
                    "Penetration testing quarterly"
                ]
            }
        ]
    },
    {
        id: "rights",
        icon: Download,
        title: "Your Rights",
        content: "You have full control over your data:",
        subsections: [
            {
                title: "You Can",
                items: [
                    "Access all your data (download anytime)",
                    "Correct inaccurate data",
                    "Delete your account (and all data)",
                    "Export your data in standard formats",
                    "Opt out of non-essential communications",
                    "Request we stop processing your data"
                ]
            },
            {
                title: "How to Exercise Your Rights",
                items: [
                    "Email: privacy@safety-companion.com",
                    "We respond within 7 days",
                    "Data exports provided within 30 days",
                    "Deletions processed within 7 days"
                ]
            }
        ]
    },
    {
        id: "breach",
        icon: AlertTriangle,
        title: "Data Breach Protocol",
        subsections: [
            {
                title: "If We're Breached",
                items: [
                    "We'll notify you within 72 hours",
                    "Email + in-app notification",
                    "Tell you what data was affected",
                    "Steps we're taking to fix it",
                    "What you should do"
                ]
            },
            {
                title: "Current Status",
                items: [
                    "✅ We've Never Been Breached",
                    "[We'll update this if that changes]"
                ],
                highlight: true
            }
        ]
    },
    {
        id: "contact",
        icon: Mail,
        title: "Contact Us",
        subsections: [
            {
                title: "Get in Touch",
                items: [
                    "Privacy Questions: privacy@safety-companion.com",
                    "Data Requests: data-requests@safety-companion.com",
                    "Security Issues: security@safety-companion.com",
                    "General Support: support@safety-companion.com"
                ]
            }
        ]
    }
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Animated Background Grid */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 pt-24 pb-16 px-6"
            >
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-block mb-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-2xl opacity-50"></div>
                            <Shield className="w-20 h-20 text-blue-400 relative" strokeWidth={1.5} />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                    >
                        Privacy Policy
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl text-slate-400"
                    >
                        Last Updated: January 5, 2026
                    </motion.p>
                </div>
            </motion.div>

            {/* Content Sections */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ delay: index * 0.1 }}
                        className="mb-8"
                    >
                        <div className="group relative bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden">
                            {/* Gradient Border Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative p-8">
                                {/* Section Header */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                                        <section.icon className="w-6 h-6 text-blue-400" strokeWidth={2} />
                                    </div>
                                    <h2 className="text-3xl font-bold text-white">{section.title}</h2>
                                </div>

                                {/* Section Content */}
                                {section.content && (
                                    <p className="text-slate-300 text-lg mb-4 leading-relaxed">{section.content}</p>
                                )}

                                {/* Subsections */}
                                {section.subsections && (
                                    <div className="space-y-6">
                                        {section.subsections.map((subsection, subIndex) => (
                                            <motion.div
                                                key={subIndex}
                                                initial={{ opacity: 0, x: -20 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: subIndex * 0.05 }}
                                                className={`rounded-xl p-6 ${(subsection as any).highlight
                                                    ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30"
                                                    : "bg-slate-800/30"
                                                    }`}
                                            >
                                                <h3 className="text-xl font-semibold text-white mb-4">{subsection.title}</h3>
                                                <ul className="space-y-3">
                                                    {subsection.items.map((item, itemIndex) => (
                                                        <motion.li
                                                            key={itemIndex}
                                                            initial={{ opacity: 0 }}
                                                            whileInView={{ opacity: 1 }}
                                                            viewport={{ once: true }}
                                                            transition={{ delay: itemIndex * 0.03 }}
                                                            className="flex items-start gap-3 text-slate-300"
                                                        >
                                                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${(subsection as any).highlight
                                                                    ? "bg-emerald-400"
                                                                    : "bg-blue-400"
                                                                }`}></span>
                                                            <span>{item}</span>
                                                        </motion.li>
                                                    ))}
                                                </ul>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Footer Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-16 text-center text-slate-500 text-sm"
                >
                    <p className="italic">
                        "We're not lawyers, but we care about your privacy. If you have questions, just ask us in plain English."
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
