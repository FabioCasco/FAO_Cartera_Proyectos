/** @type {import("next").NextConfig} */
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "FAO_Cartera_Proyectos";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? `/${repositoryName}` : "";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
