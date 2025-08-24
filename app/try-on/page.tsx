"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  User,
  Shirt,
  Sparkles,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { compressImage, downloadImage } from "@/app/utils/imageUtils";
import { ProgressStepper } from "@/app/components/ProgressStepper";

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

interface TryOnResult {
  imageUrl: string;
  processingTime?: string;
  modelUsed?: string;
  provider?: string;
  prompt?: string;
  method?: string;
}

export default function TryOnPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [personImage, setPersonImage] = useState<UploadedImage | null>(null);
  const [dressImage, setDressImage] = useState<UploadedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const steps = [
    {
      id: "person",
      label: "Upload Yourself",
      completed: currentStep > 0 && personImage !== null,
      current: currentStep === 0,
    },
    {
      id: "dress",
      label: "Upload Dress",
      completed: currentStep > 1 && dressImage !== null,
      current: currentStep === 1,
    },
    {
      id: "result",
      label: "Try-On Result",
      completed: tryOnResult !== null,
      current: currentStep === 2,
    },
  ];

  const handleImageUpload = (
    files: FileList | null,
    type: "person" | "dress"
  ) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    const id = Math.random().toString(36).substr(2, 9);
    const uploadedImage = { file, preview, id };

    if (type === "person") {
      if (personImage) {
        URL.revokeObjectURL(personImage.preview);
      }
      setPersonImage(uploadedImage);
    } else {
      if (dressImage) {
        URL.revokeObjectURL(dressImage.preview);
      }
      setDressImage(uploadedImage);
    }

    toast({
      title: "Image uploaded",
      description: `${
        type === "person" ? "Person" : "Dress"
      } image uploaded successfully.`,
    });
  };

  const removeImage = (type: "person" | "dress") => {
    if (type === "person" && personImage) {
      URL.revokeObjectURL(personImage.preview);
      setPersonImage(null);
    } else if (type === "dress" && dressImage) {
      URL.revokeObjectURL(dressImage.preview);
      setDressImage(null);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && !personImage) {
      toast({
        title: "Missing photo",
        description: "Please upload your photo to continue.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep === 1 && !dressImage) {
      toast({
        title: "Missing dress image",
        description: "Please upload a dress image to continue.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleTryOn = async () => {
    if (!personImage || !dressImage) {
      toast({
        title: "Missing images",
        description: "Please upload both person and dress images.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log("Starting try-on generation...");

      const formData = new FormData();

      // Compress and append images
      const compressedPersonImage = await compressImage(personImage.file, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      });

      const compressedDressImage = await compressImage(dressImage.file, {
        maxWidth: 1024,
        maxHeight: 1536,
        quality: 0.8,
      });

      formData.append("personImage_0", personImage.file);
      formData.append("clothingImage_0", dressImage.file);

      console.log("Calling API route...");

      const response = await fetch("/api/try-on", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      console.log("API route result:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Try-on generation failed");
      }

      setTryOnResult(result as TryOnResult);

      toast({
        title: "Try-on generated!",
        description: `Generated using ${result.provider}. Ready for review!`,
      });
    } catch (error) {
      console.error("Error generating try-on:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      setError(errorMessage);
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    if (personImage) {
      URL.revokeObjectURL(personImage.preview);
      setPersonImage(null);
    }
    if (dressImage) {
      URL.revokeObjectURL(dressImage.preview);
      setDressImage(null);
    }
    setTryOnResult(null);
    setError(null);
    setCurrentStep(0);
    toast({
      title: "Reset complete",
      description: "All images cleared. Ready for new try-on!",
    });
  };

  const onStepChange = (stepIndex: number) => {
    // Only allow going back to previous steps if they have required data
    if (stepIndex === 0) {
      setCurrentStep(0);
    } else if (stepIndex === 1 && personImage) {
      setCurrentStep(1);
    } else if (stepIndex === 2 && personImage && dressImage) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Try-On Studio
          </h1>
          <p className="text-lg text-gray-600">
            Upload a dress and your photo to see how it looks on you
          </p>
          <p className="text-sm text-purple-600 mt-1">
            Powered by OpenAI's advanced image generation
          </p>
        </div>

        {/* Progress Stepper */}
        <ProgressStepper
          steps={steps}
          currentStep={currentStep}
          onStepChange={onStepChange}
        />

        {/* Start Over Button */}
        <div className="flex justify-end mb-6">
          <Button
            variant="outline"
            onClick={handleStartOver}
            className="flex items-center gap-2 bg-transparent"
          >
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Generation Error</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-transparent"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Step 1: Upload Person Image */}
          {currentStep === 0 && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Upload Your Photo
                  </CardTitle>
                  <CardDescription>
                    Upload a clear, full-body photo with good lighting. Standing
                    straight and facing forward works best for the most accurate
                    try-on results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 flex gap-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors h-full">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <Label
                        htmlFor="person-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <span className="text-lg font-medium text-purple-600 hover:text-purple-500">
                          Click to upload your photo
                        </span>
                        <p className="text-sm text-gray-500 mt-2">
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Supports JPG, PNG, WebP
                        </p>
                      </Label>
                      <Input
                        id="person-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files, "person")
                        }
                      />
                    </div>

                    {personImage && (
                      <div className="flex justify-center">
                        <div className="relative group">
                          <Image
                            src={personImage.preview || "/placeholder.svg"}
                            alt="Person"
                            width={300}
                            height={400}
                            className="rounded-lg object-cover shadow-lg"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage("person")}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleNext}
                      disabled={!personImage}
                      className="px-8"
                      size="lg"
                    >
                      Continue to Dress Upload
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Upload Dress Image */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shirt className="w-5 h-5" />
                    Upload Dress Image
                  </CardTitle>
                  <CardDescription>
                    Upload a clear photo of the dress you want to try on. Images
                    with plain backgrounds and good lighting work best for
                    accurate results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 flex gap-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors h-full">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <Label
                        htmlFor="dress-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <span className="text-lg font-medium text-purple-600 hover:text-purple-500">
                          Click to upload dress image
                        </span>
                        <p className="text-sm text-gray-500 mt-2">
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Supports JPG, PNG, WebP
                        </p>
                      </Label>
                      <Input
                        id="dress-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files, "dress")
                        }
                      />
                    </div>

                    {dressImage && (
                      <div className="flex justify-center">
                        <div className="relative group">
                          <Image
                            src={dressImage.preview || "/placeholder.svg"}
                            alt="Dress"
                            width={300}
                            height={400}
                            className="rounded-lg object-cover shadow-lg"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage("dress")}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-4 pt-4">
                    <Button
                      onClick={() => setCurrentStep(0)}
                      variant="outline"
                      className="px-6"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!dressImage}
                      className="px-8"
                      size="lg"
                    >
                      Continue to Try-On
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Try-On Result */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Images Preview */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Your Photo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {personImage && (
                      <div className="flex justify-center">
                        <Image
                          src={personImage.preview || "/placeholder.svg"}
                          alt="Person"
                          width={200}
                          height={300}
                          className="rounded-lg object-cover shadow-md"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">
                      Dress to Try On
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dressImage && (
                      <div className="flex justify-center">
                        <Image
                          src={dressImage.preview || "/placeholder.svg"}
                          alt="Dress"
                          width={200}
                          height={300}
                          className="rounded-lg object-cover shadow-md"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Generate Button */}
              {!tryOnResult && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleTryOn}
                    disabled={isGenerating || !personImage || !dressImage}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-12"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Generating Try-On...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-3" />
                        Generate Try-On
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Result Display */}
              {tryOnResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Try-On Result</CardTitle>
                    <CardDescription className="text-center">
                      Your AI-generated virtual try-on is ready!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <div className="relative">
                          <Image
                            src={tryOnResult.imageUrl || "/placeholder.svg"}
                            alt="Try-On Result"
                            width={400}
                            height={600}
                            className="rounded-lg shadow-lg"
                          />
                        </div>
                      </div>

                      {tryOnResult.processingTime && (
                        <div className="space-y-2 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              Processing Time: {tryOnResult.processingTime}
                            </span>
                            <span className="text-purple-600">
                              {tryOnResult.provider} • {tryOnResult.modelUsed}
                            </span>
                          </div>
                          {tryOnResult.method && (
                            <div className="text-sm text-gray-500">
                              Method: {tryOnResult.method}
                            </div>
                          )}
                          {tryOnResult.prompt && (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                View Generation Prompt
                              </summary>
                              <div className="mt-2 p-3 bg-gray-50 rounded text-gray-600">
                                {tryOnResult.prompt}
                              </div>
                            </details>
                          )}
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <Button
                          onClick={async () => {
                            try {
                              await downloadImage(
                                tryOnResult.imageUrl,
                                "standalone-tryon-result.png"
                              );
                              toast({
                                title: "Downloaded",
                                description:
                                  "Try-on result downloaded successfully.",
                              });
                            } catch (error) {
                              toast({
                                title: "Download failed",
                                description:
                                  "Failed to download try-on result.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700"
                          size="lg"
                        >
                          Download Result
                        </Button>

                        <Button
                          onClick={async () => {
                            try {
                              // Download both original images and result as a set
                              if (personImage && dressImage) {
                                await downloadImage(
                                  personImage.preview,
                                  "original-person-photo.png"
                                );
                                await new Promise((resolve) =>
                                  setTimeout(resolve, 500)
                                );
                                await downloadImage(
                                  dressImage.preview,
                                  "original-dress-image.png"
                                );
                                await new Promise((resolve) =>
                                  setTimeout(resolve, 500)
                                );
                                await downloadImage(
                                  tryOnResult.imageUrl,
                                  "tryon-result.png"
                                );

                                toast({
                                  title: "Download complete",
                                  description:
                                    "All images downloaded: original photos and result.",
                                });
                              }
                            } catch (error) {
                              toast({
                                title: "Download failed",
                                description: "Failed to download image set.",
                                variant: "destructive",
                              });
                            }
                          }}
                          variant="outline"
                          className="bg-transparent"
                          size="lg"
                        >
                          Download Complete Set
                        </Button>
                      </div>

                      <div className="flex justify-center pt-4">
                        <Button
                          onClick={() => {
                            setTryOnResult(null);
                            setCurrentStep(0);
                          }}
                          variant="outline"
                          className="bg-transparent"
                        >
                          Try Another Combination
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              {!tryOnResult && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="bg-transparent"
                  >
                    Back to Dress Upload
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
