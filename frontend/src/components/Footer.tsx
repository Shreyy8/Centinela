import { appUrl, marketingUrl } from "@/config/routes";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-12 pb-8 px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10 border border-white/20 text-white">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-white tracking-[0.2em] font-mono text-xs">
              CENTINELA
            </span>
          </div>
          <p className="text-sm text-white/50 font-light">
            Forensically auditable AI safety validation &amp; control plane.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: "Dashboard", href: appUrl("/dashboard") },
            { label: "Configure", href: appUrl("/config") },
            { label: "Live Audit", href: appUrl("/audit") },
            { label: "Results & Certs", href: appUrl("/results") },
          ]}
        />
        <FooterCol
          title="Compliance"
          links={[
            { label: "HIPAA Security", href: marketingUrl("/#capabilities") },
            { label: "EU AI Act", href: marketingUrl("/#capabilities") },
            { label: "DPDP Act 2023", href: marketingUrl("/#capabilities") },
            { label: "NIST AI RMF", href: marketingUrl("/#capabilities") },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: "About", href: marketingUrl("/#capabilities") },
            { label: "Pricing", href: marketingUrl("/#pricing") },
            { label: "Contact CISO", href: "mailto:security@centinela.ai" },
            { label: "Privacy Policy", href: "#" },
          ]}
        />
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between text-[13px] text-white/40 font-light">
        <span>© {new Date().getFullYear()} CENTINELA. Built for Sovereign AI Governance.</span>
        <span>Cryptographic Proof of Assurance</span>
      </div>
    </footer>
  );
}

type LinkItem = { label: string; href: string };

function FooterCol({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-white/60 font-light">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
