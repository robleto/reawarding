export default function TestScrollPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Netflix Glow Test Page</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
          Scroll down to see the color-changing glow effect in the top-right corner
        </p>
        
        {/* Generate sections to test scrolling */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="mb-16 p-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Section {i + 1}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This is section {i + 1}. The glow color should change every 600px of scroll.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
                <h3 className="font-semibold mb-2">Feature A</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
                <h3 className="font-semibold mb-2">Feature B</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="inline-block px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg">
                Scroll Progress: {Math.round((i + 1) * 600)}px
              </div>
            </div>
          </div>
        ))}
        
        <div className="text-center py-16">
          <h2 className="text-3xl font-bold mb-4">End of Page</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You've reached the end! The glow should have cycled through all colors.
          </p>
        </div>
      </div>
    </div>
  );
}
