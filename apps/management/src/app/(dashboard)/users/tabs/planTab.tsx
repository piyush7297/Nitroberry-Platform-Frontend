import { Button } from "@nitroberry/ui";
import { Card, CardContent } from "@nitroberry/ui";
import { API_ENDPOINTS } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApi";
import { Checkbox } from "@nitroberry/ui";
import { Input } from "@nitroberry/ui";
import { Label } from "@nitroberry/ui";
import { RadioGroup, RadioGroupItem } from "@nitroberry/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nitroberry/ui";
import { Check, DownloadCloud, Mail, Plus } from "lucide-react";
import React, { memo, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@nitroberry/ui";

const availablePlans = [
  { id: "basic", name: "Basic Plan", desc: "Core features for getting started", price: "$10 / month", features: ["Access to core features", "Up to 5 team members", "Basic analytics", "Standard support"] },
  { id: "pro", name: "Pro Plan", desc: "Advanced features for professionals", price: "$29 / month", popular: true, features: ["Everything in Basic", "Unlimited team members", "Advanced analytics", "Priority support", "Custom integrations"] },
  { id: "enterprise", name: "Enterprise Plan", desc: "Custom features for large teams", price: "Custom pricing", features: ["Everything in Pro", "Dedicated account manager", "Custom contracts", "Enterprise SLA", "SSO integration"] },
];
const billingData = [
  {
    plan: "Basic Plan – Dec 2022",
    amount: "$10.00",
    date: "Dec 1, 2022",
    status: "Paid",
  },
  {
    plan: "Basic Plan – Nov 2022",
    amount: "$10.00",
    date: "Nov 1, 2022",
    status: "Paid",
  },
  {
    plan: "Basic Plan – Sep 2022",
    amount: "$10.00",
    date: "Sep 1, 2022",
    status: "Paid",
  },
];
const cardsData = [
  {
    id: "visa",
    label: "Visa ending in 1234",
    expiry: "Expiry 06/2024",
    image: "/images/visa.png",
    colorClass: "text-blue-600",
  },
  {
    id: "mastercard",
    label: "Mastercard ending in 1234",
    expiry: "Expiry 06/2024",
    image: "/images/master.png",
    colorClass: "text-red-600",
  },
];

const PlanComponentTab = () => {
  const [emailType, setEmailType] = useState("alternative");
  const [selectedCard, setSelectedCard] = useState("visa");
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");

  // API Integration for subscriptions  
  const { data: companySubscriptionSource } = useApiQuery(
    ["company_subscription_data"],
    API_ENDPOINTS.COMPANY_SUBSCRIPTION
  );

  const displayPlans = useMemo(() => {
    const defaultPlans = [...availablePlans];
    const data = companySubscriptionSource?.data || companySubscriptionSource;
    
    if (data && data.name) {
      defaultPlans[0] = {
        id: `api-${data.id}`,
        name: data.name,
        desc: data.description || "Access all features forever for free.",
        price: data.price || "Free",
        popular: false,
        features: [
          "Access to core features",
          "Up to 5 team members",
          "Basic analytics",
          "Standard support",
          `${data.subscriptionData?.length || 0} Active Modules`
        ]
      };
    }
    return defaultPlans;
  }, [companySubscriptionSource]);

  return (
    <section className="w-full space-y-5">
      {/* Header removed */}

      <div className="space-y-6">
        {/* Contact Email */}
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Left side label - 40% width */}
          <div className="md:w-[30%]">
            <label className="block text-sm font-medium text-gray-700">
              Contact email
              <br />
              <span className="text-xs text-gray-500">
                Where should invoices be sent?
              </span>
            </label>
          </div>

          {/* Right side content - 60% width */}
          <div className="md:w-[70%]">
            <RadioGroup
              defaultValue="alternative"
              onValueChange={setEmailType}
              className="space-y-2"
            >
              {/* Option 1: Account email */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="account" id="account" className="mt-1" />
                <div className="flex flex-col w-full">
                  <Label
                    htmlFor="account"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Send to my account email
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    olivia@untitledui.com
                  </p>
                </div>
              </div>

              {/* Option 2: Alternative email */}
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="alternative" id="alternative" />
                <div className="flex flex-col w-full">
                  <Label
                    htmlFor="alternative"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Send to an alternative email
                  </Label>
                  <div className="relative mt-2 max-w-1/2">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="email"
                      placeholder="billing@untitledui.com"
                      className="pl-10"
                      value="billing@untitledui.com"
                      disabled={emailType !== "alternative"}
                      onChange={(e) => e.preventDefault()}
                    />
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <hr className="border-gray-200" />
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Left side label - 30% width */}
          <div className="md:w-[30%]">
            {/* Label */}
            <label className="block text-sm font-medium text-gray-700">
              Active plan
              <br />
              <span className="text-xs text-gray-500">
                Your current subscription.
              </span>
            </label>
          </div>

          {/* Right side content - 70% width */}
          <div className="md:w-[70%]">
            {/* Active Plan Card */}
            <Card className="border-2 rounded-xl shadow-none">
              <CardContent className="flex flex-col p-4 py-0">
                {/* Plan info */}
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    {/* Left side: name + description */}
                    <div className="flex flex-col">
                      <p className="text-lg font-medium text-gray-800">
                        Pro Plan
                      </p>
                      <p className="text-xs text-gray-500">
                        Advanced features for professionals
                      </p>
                    </div>

                    {/* Right side: price */}
                    <div className="flex flex-col items-end">
                      <p className="text-xl font-bold text-gray-900">
                        $29 / month
                      </p>
                    </div>
                  </div>

                  {/* Actions or separator below */}
                  <hr className="border-gray-200" />
                  <div className="flex space-x-4 text-xs text-primary">
                    <Button
                      variant="link"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="hover:underline px-0 py-0"
                    >
                      Upgrade plan
                    </Button>
                    <Button
                      variant="link"
                      className="hover:underline px-0 py-0"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <hr className="border-gray-200" />

        {/* Card Details */}
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Left side label - 30% width */}
          <div className="md:w-[30%]">
            {/* Label */}
            <label className="block text-sm font-medium text-gray-700">
              Card details
              <br />
              <span className="text-xs text-gray-500">
                Select default payment method.
              </span>
            </label>
          </div>

          {/* Right side content - 70% width */}
          <div className="md:w-[70%] space-y-4">
            {cardsData.map((card) => (
              <Card
                key={card.id}
                onClick={() => setSelectedCard(card.id)}
                className={`cursor-pointer border-2 py-2 rounded-xl shadow-none ${
                  selectedCard === card.id
                    ? "border-primary bg-primary/5"
                    : "border-gray-200"
                }`}
              >
                <CardContent className="flex items-start p-4 relative">
                  {/* Inner circular tick */}
                  <div
                    className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      selectedCard === card.id
                        ? "border-primary bg-primary"
                        : "border-gray-400 bg-white"
                    }`}
                  >
                    {selectedCard === card.id && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </div>

                  <img
                    src={card.image}
                    alt={card.label}
                    className="h-10 object-contain mr-3"
                  />
                  <div className="flex flex-col w-full space-y-1">
                    <p className="text-sm font-medium text-gray-800">
                      {card.label}
                    </p>
                    <p className="text-xs text-gray-500">{card.expiry}</p>
                    <div className="flex space-x-3 text-xs text-primary mt-1">
                      <button className="hover:underline cursor-pointer">
                        Set as default
                      </button>
                      <button className="hover:underline cursor-pointer">
                        Edit
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Add new payment method button */}
            <Button variant="outline" className="text-black ">
              <Plus className="w-4 h-4" />
              Add new payment method
            </Button>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Billing history</h2>
            <Button variant="outline" className="text-sm">
              <DownloadCloud className="w-4 h-4 text-gray-500 cursor-pointer hover:text-black" />
              Download all
            </Button>
          </div>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox />
                  </TableHead>
                  <TableHead className="col-span-2">Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {billingData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell className="col-span-2">{item.plan}</TableCell>
                    <TableCell>{item.amount}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full border border-green-300">
                          <Check className="w-3 h-3 mr-1" /> {item.status}
                        </span>
                        <DownloadCloud className="w-4 h-4 text-gray-500 cursor-pointer hover:text-black" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Actions */}
      {/* <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => { }}>
          {"Cancel"}
        </Button>
        <Button onClick={() => { }}>{"Save"}</Button>
      </div> */}

      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[850px] gap-6">
          <DialogHeader className="pt-2 pb-1">
            <DialogTitle className="text-xl font-bold text-center">Upgrade your plan</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-4">
            {displayPlans.map(plan => {
              const [priceAmount, pricePeriod] = plan.price?.includes('/') 
                ? plan.price.split(' / ') 
                : [plan.price, ''];

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`flex flex-col p-5 rounded-2xl cursor-pointer transition-all relative
                    ${selectedPlan === plan.id 
                      ? "ring-2 ring-primary bg-primary/[0.03] shadow-md scale-[1.02] z-10" 
                      : "border border-gray-200 hover:border-gray-300 hover:shadow-md bg-white opacity-90 hover:opacity-100"
                    }
                  `}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider shadow-sm w-max">
                      Most Popular
                    </span>
                  )}
                  
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{priceAmount}</span>
                      {pricePeriod && <span className="text-xs font-medium text-gray-500">/ {pricePeriod}</span>}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-5">{plan.desc}</p>
                  
                  <ul className="mb-6 space-y-2.5 flex-grow">
                    {plan.features?.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-gray-800">
                        <Check className="w-3.5 h-3.5 text-gray-900 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="w-full mt-auto">
                    <Button 
                      className={`w-full rounded-full transition-colors text-sm py-2 h-auto ${
                        selectedPlan === plan.id 
                          ? "bg-primary text-white hover:bg-primary/90" 
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan(plan.id);
                      }}
                    >
                      {selectedPlan === plan.id ? "Your current plan" : `Upgrade to ${plan.name.split(' ')[0]}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="sm:justify-end border-t pt-4 w-full">
            <Button variant="ghost" className="text-sm text-gray-500 hover:text-gray-900 hover:bg-transparent" onClick={() => setIsUpgradeModalOpen(false)}>Cancel</Button>
            <Button className="rounded-full px-6" onClick={() => setIsUpgradeModalOpen(false)}>Confirm Upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </section>
  );
};

export const PlanTab = memo(PlanComponentTab);
