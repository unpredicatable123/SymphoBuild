<!--
	Floor plans & unit types as an accessible tab set (arrow keys, Home/End), followed by
	the optional client-managed availability table.
-->
<script lang="ts">
	import type { Unit } from '$lib/types';
	import { cx, formatNumber } from '$lib/utils';
	import Img from '$lib/components/ui/Img.svelte';

	let {
		units,
		showInventory = false,
		onenquire
	}: { units: Unit[]; showInventory?: boolean; onenquire?: (unit: string) => void } = $props();
	let selected = $state(0);
	const uid = $props.id();
	const tabs: HTMLButtonElement[] = $state([]);

	const availability = {
		available: { label: 'Available', cls: 'bg-sage-600 text-limestone-50' },
		limited: { label: 'Limited', cls: 'bg-copper-600 text-limestone-50' },
		soldOut: { label: 'Sold out', cls: 'bg-ink-900/10 text-ink-600' },
		onHold: { label: 'On hold', cls: 'bg-limestone-300 text-ink-800' }
	} as const;

	function onkeydown(e: KeyboardEvent) {
		const last = units.length - 1;
		let next: number;
		if (e.key === 'ArrowRight') next = selected === last ? 0 : selected + 1;
		else if (e.key === 'ArrowLeft') next = selected === 0 ? last : selected - 1;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = last;
		else return;
		e.preventDefault();
		selected = next;
		tabs[next]?.focus();
	}
	const unit = $derived(units[selected]);
</script>

<div>
	<div
		role="tablist"
		aria-label="Unit types"
		class="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-2"
		tabindex="-1"
		{onkeydown}
	>
		{#each units as u, i (u._key)}
			<button
				bind:this={tabs[i]}
				type="button"
				role="tab"
				id="{uid}-tab-{i}"
				aria-selected={selected === i}
				aria-controls="{uid}-panel"
				tabindex={selected === i ? 0 : -1}
				onclick={() => (selected = i)}
				class={cx(
					'min-h-11 shrink-0 rounded-pill border px-5 text-sm font-semibold transition-colors',
					selected === i
						? 'border-ink-900 bg-ink-900 text-limestone-50'
						: 'border-ink-900/20 hover:border-ink-900/50'
				)}
			>
				{u.name}
			</button>
		{/each}
	</div>

	{#if unit}
		<div
			id="{uid}-panel"
			role="tabpanel"
			aria-labelledby="{uid}-tab-{selected}"
			class="mt-6 grid gap-8 rounded-lg bg-limestone-50 p-5 shadow-hairline sm:p-8 lg:grid-cols-12"
			tabindex="0"
		>
			<div class="lg:col-span-7">
				{#key selected}
					<div class="plan overflow-hidden rounded-md bg-limestone-100">
						{#if unit.floorPlan}
							<Img
								image={unit.floorPlan}
								sizes="(min-width: 1024px) 55vw, 100vw"
								class="aspect-[7/5]"
								imgClass="object-contain!"
							/>
						{:else}
							<div
								class="blueprint-grid grid aspect-[7/5] place-items-center bg-ink-800 font-mono text-label text-limestone-300 uppercase"
							>
								Plan to be added
							</div>
						{/if}
					</div>
				{/key}
			</div>
			<div class="flex flex-col lg:col-span-5">
				<p class="font-mono text-label text-ink-500 uppercase">Unit type</p>
				<h3 class="mt-2 font-display text-display-sm">{unit.name}</h3>
				<dl class="mt-6 grid grid-cols-2 border-t border-ink-900/12">
					{#each [['Bedrooms', unit.bedrooms ? `${unit.bedrooms} BHK` : null], ['Carpet area', unit.carpetArea ? `${formatNumber(unit.carpetArea)} sq ft` : null], ['Built-up area', unit.builtUpArea ? `${formatNumber(unit.builtUpArea)} sq ft` : null], ['Price', unit.priceLabel]].filter(([, v]) => v) as [label, value] (label)}
						<div class="border-b border-ink-900/12 py-4 pr-3">
							<dt class="font-mono text-label text-ink-500 uppercase">{label}</dt>
							<dd class="mt-1 font-semibold">{value}</dd>
						</div>
					{/each}
				</dl>
				{#if unit.availability}
					<p class="mt-6 inline-flex items-center gap-3 text-sm">
						<span
							class={cx(
								'rounded-pill px-3 py-1 font-mono text-[0.68rem] uppercase',
								availability[unit.availability].cls
							)}
						>
							{availability[unit.availability].label}
						</span>
						{#if showInventory && unit.unitsAvailable !== undefined && unit.availability !== 'soldOut'}
							<span class="text-ink-600">{unit.unitsAvailable} of {unit.totalUnits} remaining</span>
						{/if}
					</p>
				{/if}
				{#if onenquire && unit.availability !== 'soldOut'}
					<button
						type="button"
						onclick={() => onenquire?.(unit.name)}
						class="link-dim mt-auto self-start pt-8 text-sm font-semibold text-copper-600"
					>
						Enquire about {unit.name} →
					</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if showInventory}
		<div class="mt-10 overflow-x-auto">
			<table class="w-full min-w-[34rem] text-left text-sm">
				<caption class="mb-3 text-left font-mono text-label text-ink-500 uppercase"
					>Availability (updated by our sales team)</caption
				>
				<thead>
					<tr class="border-b border-ink-900/20 font-mono text-label text-ink-500 uppercase">
						<th scope="col" class="py-3 pr-4 font-normal">Unit type</th>
						<th scope="col" class="py-3 pr-4 font-normal">Area</th>
						<th scope="col" class="py-3 pr-4 font-normal">Price</th>
						<th scope="col" class="py-3 pr-4 font-normal">Availability</th>
					</tr>
				</thead>
				<tbody>
					{#each units as u (u._key)}
						{@const total = u.totalUnits ?? 0}
						{@const left = u.unitsAvailable ?? 0}
						<tr class="border-b border-ink-900/10">
							<th scope="row" class="py-4 pr-4 font-semibold">{u.name}</th>
							<td class="py-4 pr-4 text-ink-600"
								>{u.carpetArea ? `${formatNumber(u.carpetArea)} sq ft` : '—'}</td
							>
							<td class="py-4 pr-4 text-ink-600">{u.priceLabel ?? 'On request'}</td>
							<td class="py-4 pr-4">
								<div class="flex items-center gap-3">
									<div
										class="h-1.5 w-24 overflow-hidden rounded-pill bg-ink-900/10"
										aria-hidden="true"
									>
										<div
											class="h-full rounded-pill bg-copper-500"
											style:width="{total ? ((total - left) / total) * 100 : 100}%"
										></div>
									</div>
									<span
										>{u.availability === 'soldOut'
											? 'Sold out'
											: total
												? `${left} left`
												: (availability[u.availability ?? 'available']?.label ?? '')}</span
									>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.plan {
			animation: rise 0.6s var(--ease-out-expo);
		}
	}
</style>
