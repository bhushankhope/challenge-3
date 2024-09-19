import {
  Button,
  FormControl,
  FormErrorMessage,
  HStack,
  Input,
  Progress,
  Text,
  useClipboard,
  useToast,
  VStack
} from "@chakra-ui/react";
import { useCallback, useState } from 'react';
import { isDomainAvailable } from '../lib/resources';
import DomainCart from './DomainCart';

export interface ChallengeProps {
  /**
   * The maximum number of domains the user is allowed to have
   * in their cart. Invalid domains count toward this limit as well.
   */
  numDomainsRequired: number;
}

export interface Domain {
  name: string;
  isAvailable: boolean;
}

export function Challenge({ numDomainsRequired }: ChallengeProps): JSX.Element {
  const [domainInput, setDomainInput] = useState<string>('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { onCopy, hasCopied } = useClipboard(domains.map(d => d.name).join(', '));

  /**
   * Validates whether a domain name is in a valid format
   * and ensures it ends with .com, .xyz, or .app.
   * @param domain - The domain name to validate.
   * @returns {boolean} - Returns true if valid, otherwise false.
   */
  const validateDomain = (domain: string): boolean => {
    const lowerCaseDomain = domain.toLowerCase();
    const isValid = /\.(com|xyz|app)$/.test(lowerCaseDomain) && !lowerCaseDomain.includes('https://');
    if (!isValid) {
      setError('Invalid domain format. Only .com, .xyz, and .app are allowed.');
    } else {
      setError(null);
    }
    return isValid;
  };

  /**
   * Adds a new domain to the domain list after validation and availability check.
   * @returns {Promise<void>}
   */
  const addDomain = useCallback(async (): Promise<void> => {
    const domain = domainInput.trim().toLowerCase();
    if (!validateDomain(domain)) return;

    if (domains.some(d => d.name === domain)) {
      setError('Domain already in cart.');
      return;
    }

    const isAvailable = await isDomainAvailable(domain);
    setDomains([...domains, { name: domain, isAvailable }]);
    setDomainInput('');
    toast({
      title: `${domain} ${isAvailable ? 'is available!' : 'is unavailable.'}`,
      status: isAvailable ? 'success' : 'error',
      duration: 2000,
      isClosable: true,
    });
  }, [domainInput, domains, toast]);

  /**
   * Removes a domain from the domain list.
   * @param domainToRemove - The domain to remove.
   */
  const removeDomain = (domainToRemove: string): void => {
    setDomains(domains.filter(d => d.name !== domainToRemove));
  };

  /**
   * Clears all domains from the cart.
   */
  const clearCart = (): void => setDomains([]);

  /**
   * Removes all unavailable domains from the cart.
   */
  const removeUnavailableDomains = (): void => setDomains(domains.filter(d => d.isAvailable));

  /**
   * Sorts domains and keeps the N best domains based on the required count.
   */
  const keepBestDomains = (): void => {
    const sortedDomains = domains.sort((a, b) => {
      const tldPriority = (tld: string) => (tld === '.com' ? 1 : tld === '.app' ? 2 : 3);
      const aTld = a.name.split('.').pop() || '';
      const bTld = b.name.split('.').pop() || '';
      return tldPriority(aTld) - tldPriority(bTld) || a.name.length - b.name.length;
    });
    setDomains(sortedDomains.slice(0, numDomainsRequired));
  };

  /**
   * Handles form submission to add a domain.
   * @param e - The form event.
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    addDomain();
  };

  /**
   * Handles domain purchase. Shows an alert if there are unavailable domains.
   */
  const handlePurchase = (): void => {
    if (domains.some(domain => !domain.isAvailable)) {
      alert('Please remove unavailable domains');
      return;
    }
    // Further purchase logic can be implemented here.
  };

  const isPurchaseDisabled: boolean = domains.length !== numDomainsRequired;

  return (
    <>
      <VStack spacing={4} align="stretch">
        <form onSubmit={handleSubmit}>
          <FormControl isInvalid={!!error}>
            <Input
              placeholder="Enter a domain (e.g., example.com)"
              value={domainInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDomainInput(e.target.value)}
            />
            {error && <FormErrorMessage>{error}</FormErrorMessage>}
            <Button onClick={addDomain} mt={2}>
              Add Domain
            </Button>
          </FormControl>
        </form>

        <DomainCart domains={domains} onDeleteDomain={removeDomain} />

        <Text>{`You have added ${domains.length} of ${numDomainsRequired} domains.`}</Text>
        <Progress value={(domains.length / numDomainsRequired) * 100} />

        <HStack spacing={4} mt={4} className='flex-wrap'>
          <Button colorScheme="green" onClick={clearCart}>Clear Cart</Button>
          <Button colorScheme="red" onClick={removeUnavailableDomains}>Remove Unavailable</Button>
          <Button onClick={onCopy}>{hasCopied ? "Copied!" : "Copy to Clipboard"}</Button>
          <Button onClick={keepBestDomains}>Keep Best Domains</Button>
          <Button colorScheme="blue" onClick={handlePurchase} isDisabled={isPurchaseDisabled}>
            Purchase
          </Button>
        </HStack>
      </VStack>
    </>
  );
}
