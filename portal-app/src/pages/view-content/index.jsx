import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { storage } from "../../firebase/firebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";
import { Document, Page, pdfjs } from "react-pdf";
import { FaFilePdf, FaVideo, FaExternalLinkAlt } from "react-icons/fa";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ViewContent = () => {
  const { UnitID } = useParams();
  const [content, setContent] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1.0);

  const isVideoLink = (url) => {
    if (!url) return false;
    return url.includes("vimeo.com") || url.includes("youtube.com") || url.includes("youtu.be");
  };

  const getEmbedUrl = (url) => {
    if (url.includes("vimeo.com")) {
      const regex = /vimeo\.com\/(\d+)/;
      const match = url.match(regex);
      const videoId = match ? match[1] : null;
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = null;
      const regExp = /[?&]v=([^&#]*)/;
      const match = url.match(regExp);
      if (match && match[1]) {
        videoId = match[1];
      }
      if (!videoId && url.includes("youtu.be")) {
        const parts = url.split("/");
        videoId = parts[parts.length - 1].split(/[?&#]/)[0];
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    return url;
  };


  const isPdfLink = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes(".pdf");
  };

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/units`);
        const units = await response.json();

        const unit = units.find((u) => u.UnitID === UnitID);
        if (unit) {
          const contentResponse = await fetch(
            `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/unit/${unit.id}`
          );
          const data = await contentResponse.json();
          setContent(data);

          if (unit.fileUrl) {
            if (isVideoLink(unit.fileUrl)) {
              setFileUrl(unit.fileUrl);
            } else {
              // For both PDF and other files, try to get the download URL
              try {
                // Remove any URL encoding from the storage path
                const decodedUrl = decodeURIComponent(unit.fileUrl);
                const fileRef = ref(storage, decodedUrl);
                const downloadURL = await getDownloadURL(fileRef);
                setFileUrl(downloadURL);
              } catch (error) {
                console.error("Error getting file URL:", error);
                setFileUrl(unit.fileUrl);
              }
            }
          }
        } else {
          throw new Error("Unit not found");
        }
      } catch (error) {
        console.error("Error fetching content:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [UnitID]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  if (error) return <div>{error}</div>;
  if (isLoading) return <div>Loading...</div>;
  if (!content) return <div>No content found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Content Header */}
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.Title}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Category:</span>
                <span className="ml-2 text-gray-800">{content.Category}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Type:</span>
                <span className="ml-2 text-gray-800">{content.Type}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Level:</span>
                <span className="ml-2 text-gray-800">{content.Level}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Duration:</span>
                <span className="ml-2 text-gray-800">{content.Duration}min</span>
              </div>
            </div>
          </div>

          {/* Abstract Section */}
          <div className="p-6 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Abstract</h2>
            <p className="text-gray-700 leading-relaxed">{content.Abstract}</p>
          </div>

          {/* Content Display Section */}
          {fileUrl && (
            <div className="p-6">
              <div className="flex items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                  {isVideoLink(fileUrl) && <FaVideo className="mr-2" />}
                  {isPdfLink(fileUrl) && <FaFilePdf className="mr-2" />}
                  {!isVideoLink(fileUrl) && !isPdfLink(fileUrl) && <FaExternalLinkAlt className="mr-2" />}
                  {isVideoLink(fileUrl) ? "Video Content" : 
                   isPdfLink(fileUrl) ? "Document Content" : 
                   "External Resource"}
                </h2>
              </div>

              {/* Add content link for PDFs and Videos */}
              {(isVideoLink(fileUrl) || isPdfLink(fileUrl)) && (
                <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Content URL:</span>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline flex items-center"
                    >
                      Open in New Tab
                      <FaExternalLinkAlt className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {isVideoLink(fileUrl) && (
                <div className="mb-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="relative pb-[56.25%] h-0">
                      <iframe
                        src={getEmbedUrl(fileUrl)}
                        frameBorder="0"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        title="Content Video"
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isPdfLink(fileUrl) && (
                <div className="mb-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-center gap-4 mb-4 bg-white p-2 rounded shadow">
                      <button
                        onClick={() => setScale(scale - 0.2)}
                        className="px-4 py-2 bg-gray-200 rounded-l hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        aria-label="Zoom Out"
                      >
                        <span className="text-lg">−</span> Zoom Out
                      </button>
                      <button
                        onClick={() => setScale(1.0)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        aria-label="Reset Zoom"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setScale(scale + 0.2)}
                        className="px-4 py-2 bg-gray-200 rounded-r hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        aria-label="Zoom In"
                      >
                        <span className="text-lg">+</span> Zoom In
                      </button>
                    </div>

                    <Document
                      file={fileUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      className="mb-4"
                      loading={<div className="text-center py-4">Loading PDF...</div>}
                      error={<div className="text-center py-4 text-red-600">Error loading PDF. Please try again later.</div>}
                    >
                      {Array.from(new Array(numPages), (el, index) => (
                        <div key={`page_${index + 1}`} className="mb-4">
                          <Page
                            pageNumber={index + 1}
                            scale={scale}
                            className="border shadow-lg"
                            renderTextLayer={false}
                            loading={<div>Loading page {index + 1}...</div>}
                          />
                        </div>
                      ))}
                    </Document>
                  </div>
                </div>
              )}

              {!isVideoLink(fileUrl) && !isPdfLink(fileUrl) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <p className="text-gray-700 mb-4">This content is hosted on an external platform.</p>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <FaExternalLinkAlt className="mr-2" />
                    Access Content
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewContent;
