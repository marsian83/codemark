import { lazy, type ReactNode, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DemoLayout from "../components/DemoLayout";
import Layout from "../components/Layout";
import LandingPage from "./landing/LandingPage";

const LookupPage = lazy(() => import("./lookup/LookupPage"));
const PublisherPage = lazy(() => import("./publisher/PublisherPage"));
const DemoPage = lazy(() => import("./demo/DemoPage"));
const UpgradeDemoPage = lazy(() => import("./demo/UpgradeDemoPage"));
const DocsPage = lazy(() => import("./docs/DocsPage"));
const VerdictsPage = lazy(() => import("./dev/VerdictsPage"));

function Lazy({ children }: { children: ReactNode }) {
	return (
		<Suspense
			fallback={<p className="text-[0.9375rem] text-sand-3">Loading…</p>}
		>
			{children}
		</Suspense>
	);
}

export default function Router() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/app" element={<Layout />}>
					<Route
						index
						element={
							<Lazy>
								<LookupPage />
							</Lazy>
						}
					/>
					<Route
						path="p/:publisher"
						element={
							<Lazy>
								<PublisherPage />
							</Lazy>
						}
					/>
					<Route
						path="demo-wallet"
						element={<Navigate to="/demo/upgrade" replace />}
					/>
					<Route
						path="docs"
						element={
							<Lazy>
								<DocsPage />
							</Lazy>
						}
					/>
					{import.meta.env.DEV ? (
						<Route
							path="dev/verdicts"
							element={
								<Lazy>
									<VerdictsPage />
								</Lazy>
							}
						/>
					) : null}
				</Route>
				<Route path="/demo" element={<DemoLayout />}>
					<Route
						index
						element={
							<Lazy>
								<DemoPage />
							</Lazy>
						}
					/>
					<Route
						path="upgrade"
						element={
							<Lazy>
								<UpgradeDemoPage />
							</Lazy>
						}
					/>
					<Route
						path="p/:publisher"
						element={
							<Lazy>
								<PublisherPage />
							</Lazy>
						}
					/>
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
