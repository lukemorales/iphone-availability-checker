import { Analytics } from "@vercel/analytics/react";
import { Layout } from "@vercel/examples-ui";
import "@vercel/examples-ui/globals.css";

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-black">
        <Layout
          deployButton={{
            customDeployUrl:
              "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fexamples%2Ftree%2Fmain%2Fsolutions%2Fcron&project-name=cron&repository-name=cron&demo-title=Vercel%20Cron%20Job%20Example&demo-description=A%20Next.js%20app%20that%20uses%20Vercel%20Cron%20Jobs%20to%20update%20data%20at%20different%20intervals.&demo-url=https%3A%2F%2Fcron-template.vercel.app%2F&demo-image=https%3A%2F%2Fcron-template.vercel.app%2Fthumbnail.png&integration-ids=oac_V3R1GIpkoJorr6fqyiwdhl17",
          }}
          path="solutions/cron"
        >
          {children}
          <Analytics />
        </Layout>
      </body>
    </html>
  );
}
