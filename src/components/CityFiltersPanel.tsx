import React from 'react';
import { Info } from 'lucide-react';

interface CityFiltersPanelProps {
  totalCities: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterCountry: string;
  onFilterCountryChange: (value: string) => void;
  filterHealth: string;
  onFilterHealthChange: (value: string) => void;
  filterActive: string;
  onFilterActiveChange: (value: string) => void;
  filterBootstrap: string;
  onFilterBootstrapChange: (value: string) => void;
  sortBy: 'name' | 'country' | 'health' | 'events' | 'free_events';
  onSortByChange: (value: 'name' | 'country' | 'health' | 'events' | 'free_events') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  groupByCountry: boolean;
  onGroupByCountryChange: (value: boolean) => void;
  uniqueCountries: string[];
}

export default function CityFiltersPanel({
  totalCities,
  searchQuery,
  onSearchChange,
  filterCountry,
  onFilterCountryChange,
  filterHealth,
  onFilterHealthChange,
  filterActive,
  onFilterActiveChange,
  filterBootstrap,
  onFilterBootstrapChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  groupByCountry,
  onGroupByCountryChange,
  uniqueCountries,
}: CityFiltersPanelProps) {
  const hasActiveFilters = searchQuery || filterCountry !== 'all' || filterHealth !== 'all' || 
    filterActive !== 'all' || filterBootstrap !== 'all';

  const clearAllFilters = () => {
    onSearchChange('');
    onFilterCountryChange('all');
    onFilterHealthChange('all');
    onFilterActiveChange('all');
    onFilterBootstrapChange('all');
  };

  if (totalCities === 0) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search cities..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Country Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
          <select
            value={filterCountry}
            onChange={(e) => onFilterCountryChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Countries</option>
            {uniqueCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        {/* Health Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Health Status</label>
          <select
            value={filterHealth}
            onChange={(e) => onFilterHealthChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy (≥80%)</option>
            <option value="good">Good (60-79%)</option>
            <option value="warning">Warning (40-59%)</option>
            <option value="critical">Critical (&lt;40%)</option>
            <option value="inactive">Inactive (0%)</option>
          </select>
        </div>

        {/* Active/Inactive Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterActive}
            onChange={(e) => onFilterActiveChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Bootstrap Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bootstrap</label>
          <select
            value={filterBootstrap}
            onChange={(e) => onFilterBootstrapChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="bootstrapping">Bootstrapping</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
          <div className="flex gap-1">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="name">Name A-Z</option>
              <option value="country">Country</option>
              <option value="health">Health Score</option>
              <option value="events">Total Events</option>
              <option value="free_events">Free Events</option>
            </select>
            <button
              onClick={onSortOrderToggle}
              className="px-2 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-r-lg border border-l-0 border-gray-300"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Group By Country Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="groupByCountry"
          checked={groupByCountry}
          onChange={(e) => onGroupByCountryChange(e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="groupByCountry" className="text-sm font-medium text-gray-700">
          Group by Country
        </label>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-600">Active filters:</span>
          {searchQuery && (
            <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
              Search: "{searchQuery}"
            </span>
          )}
          {filterCountry !== 'all' && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              Country: {filterCountry}
            </span>
          )}
          {filterHealth !== 'all' && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
              Health: {filterHealth}
            </span>
          )}
          {filterActive !== 'all' && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
              Status: {filterActive}
            </span>
          )}
          {filterBootstrap !== 'all' && (
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
              Bootstrap: {filterBootstrap}
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="ml-auto px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
