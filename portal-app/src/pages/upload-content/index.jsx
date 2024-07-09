export const UploadContent = () => {
  return (
    <div className="min-h-screen bg-blue-100 flex flex-col items-center justify-center">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-lg">
        <h2 className="text-2xl mb-4 text-center">Upload contents</h2>
        <form>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="title"
            >
              Title:
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="title"
              type="text"
              placeholder="Title"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="category"
            >
              Category:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="category"
            >
              <option>Select a category</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Languages">Languages</option>
              <option value="Arts">Arts</option>
              <option value="Physical">Physical</option>
              <option value="Education">Education</option>
              <option value="Health">Health</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="type"
            >
              Type:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="type"
            >
              <option>Select an option</option>
              <option value="Lectures">Lectures</option>
              <option value="Assignments">Assignments</option>
              <option value="Quiz">Quiz</option>
              <option value="Projects">Projects</option>
              <option value="Case studies">Case studies</option>
              <option value="Data sets">Data sets</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="level"
            >
              Level:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="level"
            >
              <option>Select an option</option>
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="duration"
            >
              Duration (minutes):
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="duration"
              type="text"
              placeholder="Duration"
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              className="mr-2 leading-tight"
              type="checkbox"
              id="makePublic"
            />
            <label
              className="text-gray-700 text-sm font-bold"
              htmlFor="makePublic"
            >
              Make Public
            </label>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="abstract"
            >
              Abstract:
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="abstract"
              rows="5"
              placeholder="Abstract"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="file"
            >
              Upload File:
            </label>
            <div className="flex items-center">
              <label className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded cursor-pointer focus:outline-none focus:shadow-outline">
                Browse...
                <input className="hidden" id="file" type="file" />
              </label>
              <span className="ml-2 text-gray-700" id="file-name"></span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="button"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
