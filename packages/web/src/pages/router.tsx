import { lazy, type ReactNode, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "../components/Layout";
import LookupPage from "./lookup/LookupPage";
import PublisherPage from "./publisher/PublisherPage";

const DemoWalletPage = lazy(() => import("./demo-wallet/DemoWalletPage"));
const VerdictsPage = lazy(() => import("./dev/VerdictsPage"));

function Lazy({ children }: { children: ReactNode }) {
	return (
		<Suspense fallback={<p className="pt-6 text-sm">Loading…</p>}>
			{children}
		</Suspense>
	);
}

export default function Router() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<LookupPage />} />
					<Route path="/p/:publisher" element={<PublisherPage />} />
					<Route
						path="/demo-wallet"
						element={
							<Lazy>
								<DemoWalletPage />
							</Lazy>
						}
					/>
					{import.meta.env.DEV ? (
						<Route
							path="/dev/verdicts"
							element={
								<Lazy>
									<VerdictsPage />
								</Lazy>
							}
						/>
					) : null}
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
