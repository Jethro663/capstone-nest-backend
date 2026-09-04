'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Download,
  Mail,
  MapPin,
  Menu,
  Phone,
} from 'lucide-react';
import { usePublicSessionProbe } from '@/hooks/usePublicSessionProbe';
import { getDefaultDashboardRouteForRole } from '@/lib/dashboard-route-access';
import { useAuth } from '@/providers/AuthProvider';
import { SchoolGallery } from './SchoolGallery';
import {
  coreValues,
  depedMissionCommitments,
  depedMissionIntro,
  depedVision,
  nexoraFeatures,
  schoolPhotos,
} from './school-content';

const navigation = [
  { label: 'About', href: '#about' },
  { label: 'School Life', href: '#school-life' },
  { label: 'Vision & Mission', href: '#direction' },
  { label: 'Nexora', href: '#nexora' },
  { label: 'Contact', href: '#contact' },
] as const;

export function SchoolLandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading, role } = useAuth();

  usePublicSessionProbe();

  useEffect(() => {
    if (loading || !isAuthenticated) {
      return;
    }

    router.replace(getDefaultDashboardRouteForRole(role));
  }, [isAuthenticated, loading, role, router]);

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <div className="landing-header__inner">
          <Link href="/" className="landing-brand" aria-label="Gat Andres Bonifacio High School home">
            <span className="landing-brand__seal">
              <Image
                src="/taguigpic.png"
                alt="Gat Andres Bonifacio High School seal"
                width={54}
                height={54}
                priority
              />
            </span>
            <span className="landing-brand__copy">
              <strong>Gat Andres Bonifacio High School</strong>
              <small>Bonifacio, Taguig City</small>
            </span>
          </Link>

          <nav className="landing-nav" aria-label="Primary navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="landing-header__actions">
            <Link href="/dashboard" className="landing-button landing-button--primary landing-header__portal">
              Open Nexora
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <details className="landing-mobile-menu">
              <summary aria-label="Open school navigation">
                <Menu className="h-5 w-5" aria-hidden="true" />
                <span>Menu</span>
              </summary>
              <nav aria-label="Mobile navigation">
                {navigation.map((item) => (
                  <a key={item.href} href={item.href}>
                    {item.label}
                  </a>
                ))}
                <Link href="/dashboard">Open Nexora</Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <p className="landing-kicker">A learner-centered public school in Taguig City</p>
            <h1 id="landing-title">Gat Andres Bonifacio High School</h1>
            <p className="landing-hero__lead">
              A school community where learners, teachers, staff, families, and partners share
              responsibility for helping every learner grow.
            </p>
            <div className="landing-actions">
              <a href="#school-life" className="landing-button landing-button--primary">
                Explore School Life
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link href="/dashboard" className="landing-button landing-button--secondary">
                Open Nexora
              </Link>
            </div>
            <p className="landing-hero__note">
              School identity, community life, and the digital campus—together in one place.
            </p>
          </div>

          <figure className="landing-hero__photo">
            <Image
              src={schoolPhotos[0].src}
              alt={schoolPhotos[0].alt}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
            <figcaption>{schoolPhotos[0].caption}</figcaption>
          </figure>
        </section>

        <section id="about" className="landing-section landing-about" aria-labelledby="about-title">
          <div className="landing-section__heading">
            <p className="landing-kicker">Our school</p>
            <h2 id="about-title">A campus shaped by the people who learn and serve here.</h2>
          </div>
          <div className="landing-about__body">
            <p>
              Gat Andres Bonifacio High School is a public-school community in Bonifacio,
              Taguig City. Learning here is sustained by the daily work of students, teachers,
              administrators, staff, families, and community partners.
            </p>
            <dl className="landing-about__facts">
              <div>
                <dt>School</dt>
                <dd>Gat Andres Bonifacio High School</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>Bonifacio, Taguig City, Philippines</dd>
              </div>
              <div>
                <dt>Digital campus</dt>
                <dd>Nexora learning portal</dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          id="school-life"
          className="landing-section landing-school-life"
          aria-labelledby="school-life-title"
        >
          <div className="landing-section__heading landing-section__heading--wide">
            <div>
              <p className="landing-kicker">Inside GABHS</p>
              <h2 id="school-life-title">Life at GABHS</h2>
            </div>
            <p>
              Explore moments of participation, recognition, school traditions, milestones, and
              community life. Select any photograph to move through the collection.
            </p>
          </div>
          <SchoolGallery photos={schoolPhotos} />
        </section>

        <section
          id="direction"
          className="landing-direction"
          aria-labelledby="direction-title"
        >
          <div className="landing-section landing-direction__inner">
            <div className="landing-section__heading landing-direction__heading">
              <p className="landing-kicker">Department of Education Vision and Mission</p>
              <h2 id="direction-title">Our Direction</h2>
              <p>
                The school’s work is grounded in a shared national commitment to every Filipino
                learner.
              </p>
            </div>

            <div className="landing-direction__columns">
              <article className="landing-direction__vision">
                <h3>Vision</h3>
                {depedVision.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>

              <article className="landing-direction__mission">
                <h3>Mission</h3>
                <p>{depedMissionIntro}</p>
                <ol>
                  {depedMissionCommitments.map((commitment, index) => (
                    <li key={commitment.audience}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{commitment.audience}</strong>
                        <p>{commitment.statement}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            <div className="landing-values" aria-labelledby="values-title">
              <div>
                <p className="landing-kicker">Core Values</p>
                <h3 id="values-title">The values we carry</h3>
              </div>
              <ul>
                {coreValues.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="nexora" className="landing-nexora" aria-labelledby="nexora-title">
          <div className="landing-nexora__art" aria-hidden="true">
            <Image
              src="/NexoraHome.png"
              alt=""
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="landing-nexora__copy">
            <p className="landing-kicker">GABHS digital campus</p>
            <h2 id="nexora-title">Our School, Connected Online</h2>
            <p className="landing-nexora__lead">
              Nexora extends the GABHS learning experience online. It keeps everyday schoolwork
              within a role-aware space for learners, teachers, and school staff.
            </p>
            <ol className="landing-nexora__features">
              {nexoraFeatures.map((feature, index) => (
                <li key={feature.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="landing-actions">
              <Link href="/dashboard" className="landing-button landing-button--light">
                Open Nexora
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="/downloads/nexora-student-mobile-release.apk"
                download="nexora-student-mobile.apk"
                className="landing-button landing-button--on-dark"
              >
                Download Student App
                <Download className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__identity">
            <Image
              src="/taguigpic.png"
              alt="Gat Andres Bonifacio High School seal"
              width={72}
              height={72}
            />
            <div>
              <p>Gat Andres Bonifacio High School</p>
              <span>Nexora is the school’s digital learning campus.</span>
            </div>
          </div>

          <div className="landing-footer__contact">
            <h2>Contact the school</h2>
            <a
              href="https://maps.google.com/?q=Bonifacio%2C%20Taguig%20City%2C%20Philippines"
              target="_blank"
              rel="noreferrer"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Bonifacio, Taguig City, Philippines
            </a>
            <a href="tel:+88087543">
              <Phone className="h-4 w-4" aria-hidden="true" />
              +8808-75-43
            </a>
            <a href="mailto:sdotapat.gabhs@deped.gov.ph">
              <Mail className="h-4 w-4" aria-hidden="true" />
              sdotapat.gabhs@deped.gov.ph
            </a>
            <p>
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Mon–Fri, 8:00 AM–5:00 PM
            </p>
          </div>

          <div className="landing-footer__portal">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <h2>Already part of GABHS?</h2>
            <p>Continue to lessons, classes, announcements, and school services in Nexora.</p>
            <Link href="/dashboard" className="landing-button landing-button--secondary">
              Open Nexora
            </Link>
          </div>
        </div>
        <div className="landing-footer__base">
          <p>Copyright 2026 Gat Andres Bonifacio High School.</p>
          <a href="#landing-title">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
