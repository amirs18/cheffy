import Image from "next/image";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        About Us
                    </h1>
                    <p className="text-xl text-gray-600">
                        Meet the team behind Cheffy
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
                    <div className="relative w-full h-96">
                        <Image
                            src="/us.jpeg"
                            alt="Our Team"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="prose prose-lg max-w-none">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Welcome to Cheffy
                        </h2>
                        <p className="text-gray-700 mb-4">
                            We are a passionate team of developers and food
                            enthusiasts who believe that cooking should be
                            accessible, fun, and personalized. Cheffy combines
                            the power of AI with your culinary creativity to
                            help you discover, create, and share amazing
                            recipes.
                        </p>
                        <p className="text-gray-700 mb-4">
                            Our mission is to make cooking more intuitive and
                            enjoyable. Whether you're a seasoned chef or just
                            starting your culinary journey, Cheffy is here to
                            help you turn your ideas into delicious meals.
                        </p>
                        <p className="text-gray-700 mb-4">
                            Through voice conversations with our AI assistant,
                            you can describe what you're craving, discuss
                            dietary preferences, and explore new flavors. Our
                            intelligent system then generates personalized
                            recipes tailored to your needs, complete with
                            ingredients, step-by-step instructions, and helpful
                            tips.
                        </p>
                        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                            What We Do
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-2">
                            <li>
                                Create personalized recipes through AI-powered
                                conversations
                            </li>
                            <li>Save and organize your favorite recipes</li>
                            <li>Discover new culinary ideas and techniques</li>
                            <li>Share your cooking journey with others</li>
                        </ul>
                        <p className="text-gray-700 mt-6">
                            Join us in revolutionizing how people discover and
                            create recipes. For those who never stop starting,
                            Cheffy is your kitchen companion.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
