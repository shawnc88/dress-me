import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Safety() {
  return (
    <Layout>
      <Head>
        <title>Content + Safety Policy · Be With Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-24 safe-area-pb">
        {/* ─── Slim celebration header — chrome only, body stays readable ─── */}
        <header className="relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 px-6 py-7 sm:px-8 mb-6 animate-rise">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px gradient-celebration opacity-70" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50 mb-2">
            We&apos;ve got you
          </p>
          <h1 className="font-sans text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Content + <span className="text-celebration">Safety</span> Policy
          </h1>
          <p className="mt-2 text-sm text-white/50">Effective Date: April 19, 2026 · Last Updated: April 19, 2026</p>
        </header>

        {/* ─── Long-form body — subtle glass, high-contrast, easy to read ─── */}
        <div className="glass-card px-5 py-8 sm:px-8 sm:py-10 space-y-10 text-[15px] leading-7 text-white/70 [&_strong]:font-semibold [&_strong]:text-white/90 [&_li::marker]:text-white/35">
          <p>
            Be With Me is built to be a great space for creators and fans of every
            kind. This Content + Safety Policy is part of our{' '}
            <a href="/terms" className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]">Terms of Service</a>{' '}
            and sets the rules for what you can post, stream, or send on the
            platform, what we absolutely do not allow, and how we enforce it.
          </p>

          <Section number="1" title="Who This Applies To">
            <p>These rules apply to all users — viewers, creators, moderators —
            in every part of the Service: live streams, Suite video calls, chat,
            direct messages, reels, stories, posts, profile pages, and gifts.
            You are 18 or older. Accounts belonging to anyone under 18 will be
            removed.</p>
          </Section>

          <Section number="2" title="Allowed Content">
            <p className="mb-2">We welcome:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gaming, music, talk/IRL, comedy, ASMR, cooking, fitness, art, and any creator content.</li>
              <li>Fashion, styling, outfit-of-the-day, thrifting, and wardrobe hauls.</li>
              <li>Beauty, skincare, hair, and makeup content for adults.</li>
              <li>Lifestyle, shopping, and shopping-along streams.</li>
              <li>Creator Q+A, panel discussions, and Suite multi-guest chats.</li>
              <li>Giveaways, raffles, and community events run under the Terms.</li>
              <li>Fashion commentary, tutorials, reviews, and educational content.</li>
              <li>Suggestive fashion content (e.g. swimwear hauls, lingerie try-ons where clothed) as long as it stays within Apple App Store appropriate standards.</li>
            </ul>
          </Section>

          <Section number="3" title="Not Allowed — Hard Limits">
            <p className="mb-2">Zero-tolerance categories. Violations lead to immediate
            account termination and, where relevant, a report to law
            enforcement:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Child sexual abuse material (CSAM)</strong> and anything sexualizing minors — absolute ban. We cooperate with NCMEC and applicable authorities.</li>
              <li><strong>Human trafficking, exploitation, or coercion.</strong></li>
              <li><strong>Non-consensual intimate imagery</strong> (&quot;revenge porn&quot;) or recording of identifiable people without consent.</li>
              <li><strong>Threats, incitement to violence, or terrorism</strong>; promotion of violent extremism.</li>
              <li><strong>Self-harm glorification</strong> or pro-suicide content.</li>
              <li><strong>Sale of firearms, drugs, stolen goods, fraudulent services</strong>, or any illegal goods.</li>
              <li><strong>Doxxing</strong> — publishing private personal information without consent.</li>
              <li><strong>Impersonation</strong> of another real person, brand, or public figure.</li>
            </ul>
          </Section>

          <Section number="4" title="Sexual Content">
            <p className="mb-2">Be With Me is a live entertainment platform, not an adult
            platform. This means:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>No full or partial nudity.</li>
              <li>No explicit sexual acts, simulated or otherwise.</li>
              <li>No content designed primarily to arouse.</li>
              <li>No solicitation for sexual services or sexual direct-messaging across the platform.</li>
              <li>Clothed swimwear, lingerie, and fashion content is allowed so long as it stays within App Store guidelines.</li>
            </ul>
            <p className="mt-2">We reserve the right to remove content that trends toward
            sexualization even if it doesn&apos;t cross a hard line, to keep the
            platform appropriate for its intended audience and App Store status.</p>
          </Section>

          <Section number="5" title="Harassment, Hate Speech, + Bullying">
            <p className="mb-2">Not permitted:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Targeted insults, slurs, or attacks on another user.</li>
              <li>Hate speech based on race, ethnicity, national origin, religion, caste, gender, sexual orientation, gender identity, disability, age, or serious medical condition.</li>
              <li>Organized pile-on harassment or raids.</li>
              <li>Encouraging others to harass a specific person.</li>
              <li>Hateful symbols or slogans associated with violent extremist groups.</li>
            </ul>
            <p className="mt-2">Healthy debate and criticism of public figures or public
            positions is fine. Personal attacks on other users are not.</p>
          </Section>

          <Section number="6" title="Misinformation + Fraud">
            <ul className="list-disc pl-5 space-y-1">
              <li>No scams, phishing, or fraudulent &quot;free gift / click here&quot; schemes.</li>
              <li>No deceptive impersonation of the Be With Me team or support.</li>
              <li>No health misinformation that could cause physical harm.</li>
              <li>No manipulated media (deepfakes) presented as genuine without clear disclosure.</li>
            </ul>
          </Section>

          <Section number="7" title="Intellectual Property">
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not stream content you don&apos;t have the right to use — e.g. rebroadcasting copyrighted film, TV, or music.</li>
              <li>Background music during a live stream must be licensed or free-to-use. Extended use of copyrighted music may result in stream muting or takedown under a DMCA notice.</li>
              <li>Trademark infringement (using another brand&apos;s name/logo to imply endorsement) is not permitted.</li>
            </ul>
            <p className="mt-2">See our <a href="/terms" className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]">Terms § 10 — DMCA</a> for how to file a copyright complaint.</p>
          </Section>

          <Section number="8" title="Privacy + Consent">
            <ul className="list-disc pl-5 space-y-1">
              <li>Do not record or share a Suite call, private DM, or another user&apos;s stream without their explicit consent.</li>
              <li>Do not share private information (address, phone, workplace, financial details) about another person.</li>
              <li>Creators filming in public should follow local laws about recording identifiable people.</li>
            </ul>
          </Section>

          <Section number="9" title="Sponsored + Promotional Content">
            <ul className="list-disc pl-5 space-y-1">
              <li>Disclose sponsorships and paid partnerships clearly (#ad, #sponsored, or a verbal disclosure on live streams).</li>
              <li>Affiliate links are allowed with disclosure.</li>
              <li>You may not run a &quot;gift-for-follows&quot; scheme, buy fake engagement, or promote pyramid / multi-level marketing recruitment.</li>
            </ul>
          </Section>

          <Section number="10" title="Reporting Content + Users">
            <p className="mb-2">You can report content or behavior at any time using the
            in-app Report button on streams, messages, profiles, and posts.
            Reports are reviewed by our moderation team 24/7.</p>
            <p className="mb-2">When you report, please include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>What rule you think was broken</li>
              <li>Where it happened (link, username, stream ID)</li>
              <li>Any screenshots or timestamps you can share</li>
            </ul>
            <p className="mt-2">For urgent safety concerns, email{' '}
            <a href="mailto:stopresolutions1@gmail.com" className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]">stopresolutions1@gmail.com</a>.
            In life-threatening emergencies, always call 911 (US) or your local
            emergency number first.</p>
          </Section>

          <Section number="11" title="Blocking + Muting">
            <p>Every user can block any other user at any time from a profile
            page or chat. Blocking hides the other user&apos;s content, prevents
            DMs, and blocks Suite invites. You can also mute a creator to hide
            their content without blocking them.</p>
          </Section>

          <Section number="12" title="How We Enforce">
            <p className="mb-2">We use a combination of:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Automated detection</strong> — AI classifiers flag suspect content in chat, streams, and reels (e.g. nudity, CSAM signals, hate keywords).</li>
              <li><strong>Human moderators</strong> — review user reports and AI flags, usually within a few hours for serious issues.</li>
              <li><strong>Proactive review</strong> — we spot-check popular streams.</li>
            </ul>
            <p className="mt-2">Actions we may take, proportional to the violation:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>In-line content removal (delete a chat message, end a stream, hide a reel).</li>
              <li>Warnings.</li>
              <li>Feature restrictions (mute from chat, disable streaming, disable gifts).</li>
              <li>Temporary suspension (24h, 7d, 30d).</li>
              <li>Permanent ban + termination of earnings where tied to violations.</li>
              <li>For illegal content: law enforcement referral + preservation of evidence.</li>
            </ul>
          </Section>

          <Section number="13" title="Appeals">
            <p>If you believe an enforcement action was wrong, you can appeal
            within 30 days by emailing{' '}
            <a href="mailto:stopresolutions1@gmail.com" className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]">stopresolutions1@gmail.com</a>{' '}
            with your username, the action taken, and why you think it was
            incorrect. A different moderator than the one who made the original
            decision will review your appeal. Decisions on CSAM, threats, or
            other severe violations are generally final.</p>
          </Section>

          <Section number="14" title="Creator Accountability">
            <p className="mb-2">Creators are responsible for their stream — that includes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The behavior of their guests in a Suite call.</li>
              <li>Moderating their own chat (they can appoint Mods from their subscribers).</li>
              <li>Responding to Be With Me moderator requests (e.g. &quot;please end stream&quot;).</li>
              <li>Not inciting their audience against another creator or user.</li>
            </ul>
            <p className="mt-2">Severe or repeat violations can lead to creator program
            removal and forfeiture of accrued earnings tied to the violating
            content, consistent with applicable law.</p>
          </Section>

          <Section number="15" title="Child Safety">
            <p>Protecting minors online is non-negotiable. If you see content
            involving a minor or suspicious interactions with a minor, report it
            immediately. We report CSAM to NCMEC (National Center for Missing +
            Exploited Children) and cooperate with law-enforcement
            investigations. Accounts found to have distributed CSAM are
            permanently banned and reported; we preserve evidence as required
            by law.</p>
          </Section>

          <Section number="16" title="Safety Tips for Users">
            <ul className="list-disc pl-5 space-y-1">
              <li>Don&apos;t share your password, 2FA codes, address, or payment details in chat — we will never ask for them.</li>
              <li>Be skeptical of &quot;free gift / click here&quot; links, especially in DMs.</li>
              <li>Use block and report liberally. Don&apos;t engage with obvious trolls.</li>
              <li>Turn on DM filters to only receive messages from people you follow.</li>
              <li>If something feels off in a Suite call, you can leave at any time.</li>
            </ul>
          </Section>

          <Section number="17" title="Transparency">
            <p>We plan to publish periodic transparency reports summarizing
            enforcement actions, takedown rates, and government requests. Once
            the first report is live it will be linked from this page.</p>
          </Section>

          <Section number="18" title="Updates">
            <p>We&apos;ll update this policy as the platform and applicable laws
            evolve. Material changes will be announced in-app. Continued use
            means you accept the updated rules.</p>
          </Section>

          <Section number="19" title="Contact">
            <p>
              Safety concerns, trust-and-safety inquiries, or questions about this policy:<br />
              <a href="mailto:stopresolutions1@gmail.com" className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]">
                stopresolutions1@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

// Rotating accent hues for section headings — color in the chrome, calm in the body.
const SECTION_ACCENTS = [
  'text-accent-cyan',
  'text-accent-violet',
  'text-accent-pink',
  'text-accent-blue',
] as const;

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  const accent = SECTION_ACCENTS[(parseInt(number, 10) - 1) % SECTION_ACCENTS.length] ?? SECTION_ACCENTS[0];
  return (
    <section className="scroll-mt-24">
      <h2 className={`font-sans text-base sm:text-lg font-bold tracking-tight mb-3 ${accent}`}>
        <span className="opacity-60">{number}.</span> {title}
      </h2>
      {children}
    </section>
  );
}
