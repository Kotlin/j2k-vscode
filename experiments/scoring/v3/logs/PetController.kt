package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import java.util.Optional
import org.springframework.stereotype.Controller
import org.springframework.ui.ModelMap
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.validation.BindingResult
import org.springframework.web.bind.WebDataBinder
import jakarta.validation.Valid
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
@RequestMapping("/owners/{ownerId}")
class PetController(
    private val owners: OwnerRepository,
    private val types: PetTypeRepository
) {

    companion object {
        const val VIEWS_PETS_CREATE_OR_UPDATE_FORM = "pets/createOrUpdatePetForm"
    }

    @ModelAttribute("types")
    fun populatePetTypes(): Collection<PetType> = this.types.findPetTypes()

    @ModelAttribute("owner")
    fun findOwner(@PathVariable("ownerId") ownerId: Int): Owner {
        return owners.findById(ownerId)
            .orElseThrow { IllegalArgumentException("Owner not found with id: $ownerId.") }
    }

    @ModelAttribute("pet")
    fun findPet(@PathVariable("ownerId") ownerId: Int, @PathVariable(name = "petId", required = false) petId: Int?): Pet {
        return if (petId == null) {
            Pet()
        } else {
            val owner = this.findOwner(ownerId)
            owner.getPet(petId) ?: throw IllegalArgumentException("Pet not found with id: $petId for owner $ownerId.")
        }
    }

    @InitBinder("owner")
    fun initOwnerBinder(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @InitBinder("pet")
    fun initPetBinder(dataBinder: WebDataBinder) {
        dataBinder.setValidator(PetValidator())
    }

    @GetMapping("/pets/new")
    fun initCreationForm(owner: Owner, model: ModelMap): String {
        val pet = Pet()
        owner.addPet(pet)
        return VIEWS_PETS_CREATE_OR_UPDATE_FORM
    }

    @PostMapping("/pets/new")
    fun processCreationForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        val petName = pet.name

        if (!petName.isNullOrEmpty() && pet.isNew()) {
            val existingPet = owner.getPet(petName, true)
            if (existingPet != null) {
                result.rejectValue("name", "duplicate.petExists")
            }
        }

        pet.birthDate?.let { birthDate ->
            val currentDate = LocalDate.now()
            if (birthDate.isAfter(currentDate)) {
                result.rejectValue("birthDate", "typeMismatch.futureBirthDate")
            }
        } ?: {}

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        owner.addPet(pet)
        owners.save(owner)

        redirectAttributes.addAttribute("message", "New Pet has been Added")

        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/pets/{petId}/edit")
    fun initUpdateForm(): String = VIEWS_PETS_CREATE_OR_UPDATE_FORM

    @PostMapping("/pets/{petId}/edit")
    fun processUpdateForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        val petName = pet.name

        if (!petName.isNullOrEmpty()) {
            val existingPet = owner.getPet(petName, false)
            if (existingPet != null && !existingPet.id.equals(pet.id)) {
                result.rejectValue("name", "duplicate.petExists")
            }
        }

        pet.birthDate?.let { birthDate ->
            val currentDate = LocalDate.now()
            if (birthDate.isAfter(currentDate)) {
                result.rejectValue("birthDate", "typeMismatch.futureBirthDate")
            }
        } ?: {}

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        updatePetDetails(owner, pet)

        redirectAttributes.addAttribute("message", "Pet details has been edited")

        return "redirect:/owners/${owner.id}"
    }

    private fun updatePetDetails(owner: Owner, pet: Pet) {
        val existingPet = owner.getPet(pet.id)
        if (existingPet != null) {
            // Update existing pet's properties
            existingPet.name = pet.name
            existingPet.birthDate = pet.birthDate
            existingPet.type = pet.type
        } else {
            // Add new pet to the owner's list of pets
            owner.addPet(pet)
        }
        owners.save(owner)
    }

}